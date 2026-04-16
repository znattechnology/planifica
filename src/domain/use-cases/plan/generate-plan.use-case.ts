import { Plan, PlanType, PlanStatus, PlanContent } from '@/src/domain/entities/plan.entity';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { IDosificacaoRepository } from '@/src/domain/interfaces/repositories/dosificacao.repository';
import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import { CalendarResolutionService } from '@/src/domain/services/calendar-resolution.service';
import {
  IAIPlanGeneratorService,
  GeneratePlanInput,
  CalendarContext,
  SiblingPlanSummary,
  FocusWeekData,
  AdjustedWeekInfo,
} from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { SchoolCalendar, CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';
import { PlanValidationService } from '@/src/ai/services/plan-validation.service';
import { PlanQualityService } from '@/src/ai/services/plan-quality.service';
import { TeachingHistoryService } from '@/src/ai/services/teaching-history.service';
import { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import { calculateEffectiveTeachingWeeks, extractWeeksFromParent } from '@/src/shared/utils/teaching-weeks';
import { CalendarImpactService } from '@/src/domain/services/calendar-impact.service';
import { PlanCalendarValidationService } from '@/src/domain/services/plan-calendar-validation.service';
import { WorkloadAdjustmentService } from '@/src/domain/services/workload-adjustment.service';
import { PlanPostCorrectionService } from '@/src/domain/services/plan-post-correction.service';
import { CurriculumIntelligenceService } from '@/src/domain/services/curriculum-intelligence.service';
import { LearningScienceService } from '@/src/domain/services/learning-science.service';
import { sanitizeDosificacaoContent } from '@/src/shared/lib/sanitize-dosificacao';
import { sanitizePromptInput } from '@/src/shared/lib/sanitize-prompt';

const CALENDAR_EVENT_TYPES_FOR_PLANS = [
  CalendarEventType.NATIONAL_HOLIDAY,
  CalendarEventType.SCHOOL_HOLIDAY,
  CalendarEventType.TRIMESTER_BREAK,
  CalendarEventType.EXAM_PERIOD,
  CalendarEventType.MAKEUP_EXAM,
  CalendarEventType.PEDAGOGICAL_ACTIVITY,
  CalendarEventType.SCHOOL_EVENT,
  CalendarEventType.CUSTOM,
];

const DEFAULT_LESSONS_PER_WEEK = 2;

export interface GeneratePlanUseCaseInput {
  userId: string;
  dosificacaoId?: string;
  type: PlanType;
  title: string;
  trimester?: number;
  week?: number;
  parentPlanId?: string;
  additionalContext?: string;
  allowAutoAdjustments?: boolean;
  lessonsPerWeek?: number;
}

export class GeneratePlanUseCase {
  private readonly validator = new PlanValidationService();
  private readonly qualityService = new PlanQualityService();
  private readonly teachingHistoryService: TeachingHistoryService;
  private readonly calendarResolution: CalendarResolutionService;
  private readonly calendarValidation: PlanCalendarValidationService;
  private readonly workloadAdjustment: WorkloadAdjustmentService;
  private readonly postCorrection: PlanPostCorrectionService;
  private readonly curriculumIntelligence: CurriculumIntelligenceService;
  private readonly learningScience: LearningScienceService;

  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly dosificacaoRepository: IDosificacaoRepository,
    private readonly aiService: IAIPlanGeneratorService,
    private readonly schoolCalendarRepository: ISchoolCalendarRepository,
    private readonly lessonRepository?: ILessonRepository,
    private readonly activityRepository?: ITeachingActivityRepository,
    calendarResolution?: CalendarResolutionService,
    calendarImpactService?: CalendarImpactService,
  ) {
    this.calendarResolution = calendarResolution || new CalendarResolutionService(
      schoolCalendarRepository,
      { findById: async () => null } as unknown as import('@/src/domain/interfaces/repositories/user.repository').IUserRepository,
    );
    const impactService = calendarImpactService || new CalendarImpactService();
    this.calendarValidation = new PlanCalendarValidationService(impactService);
    this.workloadAdjustment = new WorkloadAdjustmentService(impactService);
    this.postCorrection = new PlanPostCorrectionService(impactService);
    this.curriculumIntelligence = new CurriculumIntelligenceService();
    this.learningScience = new LearningScienceService();
    if (lessonRepository && activityRepository) {
      this.teachingHistoryService = new TeachingHistoryService(lessonRepository, activityRepository);
    } else {
      // Stub that returns null — graceful when no lesson/activity repos provided
      this.teachingHistoryService = { buildFeedbackSummary: async () => null, buildContext: async () => null } as unknown as TeachingHistoryService;
    }
  }

  async execute(input: GeneratePlanUseCaseInput): Promise<Plan> {
    let dosificacaoId = input.dosificacaoId;
    let parentPlanContent: PlanContent | undefined;
    let focusWeekData: FocusWeekData | undefined;

    // Resolve parent plan first (may provide dosificacaoId)
    if (input.parentPlanId) {
      const parentPlan = await this.planRepository.findById(input.parentPlanId);
      if (!parentPlan) {
        throw new EntityNotFoundError('Plan', input.parentPlanId);
      }
      parentPlanContent = parentPlan.content;
      if (!dosificacaoId) {
        dosificacaoId = parentPlan.dosificacaoId;
      }

      // Extract specific week(s) from parent for targeted generation
      focusWeekData = this.extractFocusWeeks(parentPlanContent, input.type, input.week);
    }

    if (!dosificacaoId) {
      throw new Error('dosificacaoId is required (either directly or via parent plan)');
    }

    const dosificacao = await this.dosificacaoRepository.findById(dosificacaoId);
    if (!dosificacao) {
      throw new EntityNotFoundError('Dosificacao', dosificacaoId);
    }

    // Fetch calendar context (optional — graceful degradation)
    // Also capture calendarId for plan provenance tracking
    const { calendarContext, calendarId: resolvedCalendarId, calendarVersion: resolvedCalendarVersion, calendarSource: resolvedCalendarSource } = await this.fetchCalendarContextWithId(input.userId, dosificacao.academicYear, input.trimester);

    // Fetch sibling plans for continuity awareness
    const siblingPlanSummaries = await this.fetchSiblingPlanSummaries(dosificacaoId, input.type);

    // Guard: prevent duplicate trimester plan generation (e.g. from double-click or race condition).
    // Check GENERATING status — two concurrent requests for the same trimester would both succeed
    // without this guard, producing two orphaned plans for the same teaching period.
    if (input.type === PlanType.TRIMESTER && input.trimester) {
      const existingPlans = await this.planRepository.findByDosificacaoId(dosificacaoId);
      const alreadyGenerating = existingPlans.some(
        p => p.type === input.type &&
          p.trimester === input.trimester &&
          p.status === PlanStatus.GENERATING,
      );
      if (alreadyGenerating) {
        throw new Error(`Plano ${input.type} T${input.trimester} já está em geração para esta dosificação. Aguarde a conclusão antes de gerar outro.`);
      }
    }

    // Detect late entry: teacher starts in T2/T3 with no prior trimester plans
    const isLateEntry =
      input.type === PlanType.TRIMESTER &&
      (input.trimester ?? 1) > 1 &&
      siblingPlanSummaries.length === 0;

    // Fetch teaching history for adaptive generation (only if auto-adjustments enabled)
    const autoAdjust = input.allowAutoAdjustments !== false; // default true
    let teachingHistory: string | null = null;
    let teachingHistoryContext: import('@/src/ai/services/teaching-history.service').TeachingHistoryContext | null = null;
    if (autoAdjust) {
      try {
        teachingHistoryContext = await this.teachingHistoryService.buildContext(input.userId, dosificacao.subject);
        if (teachingHistoryContext) {
          teachingHistory = this.teachingHistoryService.buildSummaryFromContext(teachingHistoryContext);
        }
      } catch {
        // Proceed without teaching history
      }
    }

    // When auto-adjustments are OFF, inject a restriction instruction
    let adjustedAdditionalContext = input.additionalContext || '';
    if (!autoAdjust) {
      adjustedAdditionalContext += '\n\nModo restrito: apenas sugerir melhorias, não alterar estrutura existente. Manter a estrutura e ritmo do plano pai exactamente como está.';
    }

    // Late entry: inject context + concrete prior-topic list so AI can anchor review to real content.
    // Without prior topic titles the AI has no source for review content and will either hallucinate
    // or produce generic filler ("revisão dos conteúdos anteriores") that violates PLAN_GENERATOR Rule 1.
    if (isLateEntry) {
      const trimNum = input.trimester ?? 2;
      const lateEntryParts: string[] = [
        `[ENTRADA TARDIA] Este professor inicia no ${trimNum}º trimestre sem planos anteriores no sistema.`,
        `Os conteúdos dos trimestres anteriores foram leccionados fora do sistema.`,
      ];

      // Provide previous-trimester topic titles as an explicit, labelled source.
      // Label prevents the AI from treating them as T3 scope topics.
      // prevTopics is hoisted so it can gate the review instruction below.
      let prevTopics: string[] = [];
      if (parentPlanContent?.trimesters) {
        // Only the immediate predecessor trimester — earlier trimesters are too distant for
        // relevant review and including them inflates the prompt with content the AI can't use.
        const predecessorTrim = parentPlanContent.trimesters.find(t => t.number === trimNum - 1);
        if (predecessorTrim) {
          prevTopics = predecessorTrim.topics
            .filter(tp => tp.title.trim().length > 0) // skip ghost topics
            .map(tp => `T${predecessorTrim.number}: ${sanitizePromptInput(tp.title)}`)
            .slice(0, 20);
        }
        if (prevTopics.length > 0) {
          lateEntryParts.push(
            `Tópicos abordados antes deste trimestre (referência para revisão APENAS — NÃO incluir como tópicos novos do ${trimNum}º trimestre): ${prevTopics.join(' | ')}.`,
          );
        }
      }

      // Only reference "lista acima" when the list was actually injected.
      // Without prior topics the reference is a dangling pointer — the AI has no source
      // for review content and would either hallucinate or violate Rule 1.
      lateEntryParts.push(
        prevTopics.length > 0
          ? `Na 1ª semana, nos conteúdos da primeira aula, inclui revisão breve dos pré-requisitos da lista acima; nas semanas seguintes, segue exclusivamente os tópicos do ${trimNum}º trimestre.`
          : `Inicia directamente os tópicos do ${trimNum}º trimestre. Assume que os conteúdos anteriores foram leccionados fora do sistema.`,
      );

      const lateEntryHint = lateEntryParts.join('\n');
      adjustedAdditionalContext = adjustedAdditionalContext
        ? `${adjustedAdditionalContext}\n\n${lateEntryHint}`
        : lateEntryHint;
    }

    // Compute deterministic workload adjustments for AI (trimester/biweekly plans)
    let adjustedWeekTemplate: AdjustedWeekInfo[] | undefined;
    const baseLessonsPerWeek = input.lessonsPerWeek || DEFAULT_LESSONS_PER_WEEK;
    if (calendarContext && input.trimester && (input.type === PlanType.TRIMESTER || input.type === PlanType.BIWEEKLY)) {
      try {
        const result = this.workloadAdjustment.adjustForTrimester(calendarContext, input.trimester, baseLessonsPerWeek);
        if (result) {
          adjustedWeekTemplate = result.weeks.map(w => ({
            weekNumber: w.weekNumber,
            weekStart: w.weekStart,
            weekEnd: w.weekEnd,
            adjustedLessons: w.adjustedLessons,
            isNonTeaching: w.isNonTeaching,
            isReviewWeek: w.isReviewWeek,
            isExamWeek: w.isExamWeek,
            impactSummary: w.impactSummary,
          }));
        }
      } catch {
        // Non-critical — proceed without workload adjustment
      }
    }

    // Build curriculum graph + learning science hints (pre-generation intelligence)
    let learningScienceHints = '';
    if (dosificacao.content && (input.type === PlanType.TRIMESTER || input.type === PlanType.ANNUAL)) {
      try {
        const graph = this.curriculumIntelligence.buildGraph(sanitizeDosificacaoContent(dosificacao.content));
        const effectiveWeeks = calendarContext?.effectiveTeachingWeeks
          || calendarContext?.terms.find(t => t.trimester === input.trimester)?.teachingWeeks
          || 12;
        const examWeeks = adjustedWeekTemplate
          ? adjustedWeekTemplate.filter(w => w.isExamWeek).map(w => w.weekNumber)
          : [];
        learningScienceHints = this.learningScience.buildPreGenerationHints(graph, effectiveWeeks, examWeeks);
        if (learningScienceHints) {
          adjustedAdditionalContext = adjustedAdditionalContext
            ? `${adjustedAdditionalContext}\n\n${learningScienceHints}`
            : learningScienceHints;
        }
      } catch {
        // Non-critical — proceed without learning science hints
      }
    }

    const plan = await this.planRepository.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      subject: dosificacao.subject,
      grade: dosificacao.grade,
      academicYear: dosificacao.academicYear,
      trimester: input.trimester,
      weekIndex: input.week,
      content: { generalObjectives: [], specificObjectives: [], competencies: [], topics: [] },
      status: PlanStatus.GENERATING,
      generatingStartedAt: new Date(),
      dosificacaoId,
      calendarId: resolvedCalendarId,
      calendarVersion: resolvedCalendarVersion,
      calendarSource: resolvedCalendarSource,
      calendarSnapshot: calendarContext ? { terms: calendarContext.terms, events: calendarContext.events, effectiveTeachingWeeks: calendarContext.effectiveTeachingWeeks } : undefined,
      parentPlanId: input.parentPlanId,
      allowAutoAdjustments: autoAdjust,
    });

    // Fire AI generation in background — don't block the response
    this.generateInBackground(plan.id, {
      type: input.type,
      dosificacao,
      subject: dosificacao.subject,
      grade: dosificacao.grade,
      trimester: input.trimester,
      week: input.week,
      parentPlanContent,
      focusWeekData,
      additionalContext: adjustedAdditionalContext.trim() || undefined,
      calendarId: resolvedCalendarId,
      calendarContext: calendarContext || undefined,
      siblingPlanSummaries: siblingPlanSummaries.length > 0 ? siblingPlanSummaries : undefined,
      teachingHistory: teachingHistory || undefined,
      adjustedWeekTemplate,
    }, {
      parentPlanContent,
      parentPlanId: input.parentPlanId,
      siblingPlanSummaries,
      calendarContext,
      trimester: input.trimester,
      teachingHistoryContext,
      isLateEntry,
    });

    return plan;
  }

  /**
   * Extract targeted week data from parent plan for focused generation.
   */
  private extractFocusWeeks(
    parentContent: PlanContent,
    childType: PlanType,
    weekNumber?: number,
  ): FocusWeekData | undefined {
    if (!parentContent.weeklyPlan || parentContent.weeklyPlan.length === 0) {
      return undefined;
    }

    // weekNumber is 1-based from user input, convert to 0-based index
    const weekIndex = weekNumber ? weekNumber - 1 : 0;

    if (childType === PlanType.BIWEEKLY) {
      // Extract 2 consecutive weeks
      const weeks = extractWeeksFromParent(parentContent.weeklyPlan, weekIndex, 2);
      return weeks.length > 0
        ? { weeks, weekIndex, totalWeeksInParent: parentContent.weeklyPlan.length }
        : undefined;
    }

    if (childType === PlanType.LESSON) {
      // Extract 1 specific week
      const weeks = extractWeeksFromParent(parentContent.weeklyPlan, weekIndex, 1);
      return weeks.length > 0
        ? { weeks, weekIndex, totalWeeksInParent: parentContent.weeklyPlan.length }
        : undefined;
    }

    return undefined;
  }

  private async fetchCalendarContextWithId(
    userId: string,
    academicYear: string,
    trimester?: number,
  ): Promise<{ calendarContext: CalendarContext | null; calendarId?: string; calendarVersion?: number; calendarSource?: 'selected' | 'ministerial' | 'legacy' | 'none' }> {
    try {
      const result = await this.calendarResolution.resolveWithMetadata(userId, academicYear);
      if (!result.calendar) return { calendarContext: null, calendarSource: 'none' };
      return {
        calendarContext: this.toCalendarContext(result.calendar, trimester),
        calendarId: result.calendar.id,
        calendarVersion: result.calendar.version,
        calendarSource: result.source,
      };
    } catch {
      return { calendarContext: null, calendarSource: 'none' };
    }
  }

  private toCalendarContext(calendar: SchoolCalendar, trimester?: number): CalendarContext {
    const terms = calendar.terms.map(t => ({
      trimester: t.trimester,
      startDate: t.startDate.toISOString().split('T')[0],
      endDate: t.endDate.toISOString().split('T')[0],
      teachingWeeks: t.teachingWeeks,
    }));

    const events = calendar.events
      .filter(e => CALENDAR_EVENT_TYPES_FOR_PLANS.includes(e.type as CalendarEventType))
      .map(e => ({
        title: e.title,
        startDate: e.startDate.toISOString().split('T')[0],
        endDate: e.endDate.toISOString().split('T')[0],
        type: e.type,
      }));

    // Calculate effective teaching weeks for the specific trimester
    let effectiveTeachingWeeks: number | undefined;
    if (trimester) {
      const term = terms.find(t => t.trimester === trimester);
      if (term) {
        const termEvents = events.filter(e => {
          return e.startDate >= term.startDate && e.startDate <= term.endDate;
        });
        effectiveTeachingWeeks = calculateEffectiveTeachingWeeks(
          term.startDate,
          term.endDate,
          termEvents,
        );
      }
    }

    return { terms, events, effectiveTeachingWeeks };
  }

  private async fetchSiblingPlanSummaries(
    dosificacaoId: string,
    currentType: PlanType,
  ): Promise<SiblingPlanSummary[]> {
    try {
      const allPlans = await this.planRepository.findByDosificacaoId(dosificacaoId);
      return allPlans
        .filter(p => p.type === currentType && p.status === PlanStatus.GENERATED)
        .map(p => ({
          title: p.title,
          topicTitles: (p.content.topics || []).map(t => t.title),
          generalObjectives: p.content.generalObjectives || [],
        }));
    } catch {
      return [];
    }
  }

  private generateInBackground(
    planId: string,
    input: GeneratePlanInput,
    validationCtx: {
      parentPlanContent?: PlanContent;
      parentPlanId?: string;
      siblingPlanSummaries: SiblingPlanSummary[];
      calendarContext: CalendarContext | null;
      trimester?: number;
      teachingHistoryContext?: import('@/src/ai/services/teaching-history.service').TeachingHistoryContext | null;
      isLateEntry?: boolean;
    },
  ): void {
    this.runGenerationWithRetry(planId, input, validationCtx).catch(async (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[GeneratePlan] Background generation FAILED for plan ${planId} (type=${input.type}):`, errorMessage);
      try {
        await this.planRepository.update(planId, {
          status: PlanStatus.DRAFT,
          content: {
            generalObjectives: [],
            specificObjectives: [],
            competencies: [],
            topics: [],
            criticalNotes: `Erro na geração: ${errorMessage}`,
          },
        });
      } catch (updateError) {
        console.error(`[GeneratePlan] Failed to update plan ${planId} to DRAFT after generation error:`, updateError);
      }
    });
  }

  private async runGenerationWithRetry(
    planId: string,
    input: GeneratePlanInput,
    validationCtx: {
      parentPlanContent?: PlanContent;
      parentPlanId?: string;
      siblingPlanSummaries: SiblingPlanSummary[];
      calendarContext: CalendarContext | null;
      trimester?: number;
      teachingHistoryContext?: import('@/src/ai/services/teaching-history.service').TeachingHistoryContext | null;
      isLateEntry?: boolean;
    },
  ): Promise<void> {
    const AI_RETRY_THRESHOLD = 7;
    const MAX_RETRIES = 1;

    let bestContent: PlanContent | null = null;
    let bestScores: import('@/src/domain/entities/plan.entity').PlanQualityScores | undefined;
    let bestValidation: import('@/src/ai/services/plan-validation.service').ValidationResult | null = null;
    let retryUsed = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const currentInput = attempt === 0 ? input : {
        ...input,
        additionalContext: [
          input.additionalContext || '',
          '',
          '══ FEEDBACK DE TENTATIVA ANTERIOR ══',
          'O plano anterior teve os seguintes problemas:',
          ...(bestContent?.criticalNotes ? [bestContent.criticalNotes] : []),
          ...(bestScores ? [`Score de qualidade: ${bestScores.overallScore}/10 (${bestScores.qualityLabel})`] : []),
          'Corrige estes problemas. Respeita rigorosamente o calendário escolar.',
        ].join('\n').trim(),
      };

      const generatedContent = await this.aiService.generatePlan(currentInput);

      // Check for semantically empty content (passed JSON parsing but has no substance)
      const hasContent = (generatedContent.topics && generatedContent.topics.length > 0)
        || (generatedContent.generalObjectives && generatedContent.generalObjectives.length > 0)
        || (generatedContent.lessonPhases && generatedContent.lessonPhases.length > 0);
      if (!hasContent) {
        generatedContent.criticalNotes = generatedContent.criticalNotes
          ? `${generatedContent.criticalNotes}\n\n[ERROR] EMPTY_CONTENT: A IA retornou conteúdo vazio — sem temas nem objectivos.`
          : '[ERROR] EMPTY_CONTENT: A IA retornou conteúdo vazio — sem temas nem objectivos.';
      }

      // Task 5 — Fallback visibility: warn when trimester generation had no trimesters[] partition
      if (
        input.type === PlanType.TRIMESTER &&
        input.parentPlanContent &&
        !input.parentPlanContent.trimesters?.length
      ) {
        const fallbackNote = '[AVISO] Estrutura trimestral ausente no plano anual pai. Sistema operou em modo degradado (sem partição determinística). Gere o plano anual novamente para obter trimesters[].';
        generatedContent.criticalNotes = generatedContent.criticalNotes
          ? `${generatedContent.criticalNotes}\n\n${fallbackNote}`
          : fallbackNote;
      }

      // Late entry warning — visible to teacher in the final plan
      if (validationCtx.isLateEntry) {
        const lateNote = `[AVISO] Professor em entrada tardia (${validationCtx.trimester}º trimestre) sem histórico de T1/T2 no sistema. O plano assume que os conteúdos anteriores já foram leccionados. Recomenda-se validação manual e reforço de pré-requisitos nas primeiras semanas.`;
        generatedContent.criticalNotes = generatedContent.criticalNotes
          ? `${generatedContent.criticalNotes}\n\n${lateNote}`
          : lateNote;
      }

      // Post-generation structural validation
      const validation = this.validator.validate({
        planType: input.type,
        generatedContent,
        parentPlanContent: validationCtx.parentPlanContent,
        siblingPlanSummaries: validationCtx.siblingPlanSummaries.length > 0
          ? validationCtx.siblingPlanSummaries
          : undefined,
        calendarContext: validationCtx.calendarContext || undefined,
        trimester: validationCtx.trimester,
        dosificacaoContent: input.dosificacao?.content,
      });

      // Calendar-specific validation (deep per-week check)
      if (validationCtx.calendarContext) {
        const calendarValidation = this.calendarValidation.validatePlanAgainstCalendar(
          generatedContent,
          validationCtx.calendarContext,
          validationCtx.trimester,
        );
        if (calendarValidation.issues.length > 0) {
          const calNotes = calendarValidation.issues
            .map(i => `[${i.severity.toUpperCase()}] Semana ${i.weekNumber}: ${i.message}`)
            .join('\n');
          generatedContent.criticalNotes = generatedContent.criticalNotes
            ? `${generatedContent.criticalNotes}\n\n--- Validação Calendário (score: ${calendarValidation.score}/10) ---\n${calNotes}`
            : `--- Validação Calendário (score: ${calendarValidation.score}/10) ---\n${calNotes}`;
        }
      }

      // Store structural validation notes
      if (validation.issues.length > 0) {
        const notes = validation.issues
          .map(i => `[${i.severity.toUpperCase()}] ${i.code}: ${i.message}`)
          .join('\n');
        generatedContent.criticalNotes = generatedContent.criticalNotes
          ? `${generatedContent.criticalNotes}\n\n--- Validação ---\n${notes}`
          : `--- Validação ---\n${notes}`;
      }

      // ★ Curriculum sequence validation: check prerequisite ordering
      let curriculumViolations: import('@/src/domain/services/curriculum-intelligence.service').SequenceViolation[] = [];
      if (generatedContent.weeklyPlan && generatedContent.weeklyPlan.length > 0 && input.dosificacao?.content) {
        try {
          const graph = this.curriculumIntelligence.buildGraph(sanitizeDosificacaoContent(input.dosificacao.content));
          const seqResult = this.curriculumIntelligence.validateSequence(generatedContent.weeklyPlan, graph);
          curriculumViolations = seqResult.violations;
          if (seqResult.violations.length > 0) {
            const seqNotes = seqResult.violations
              .map(v => `[${v.severity.toUpperCase()}] ${v.message}`)
              .join('\n');
            generatedContent.criticalNotes = generatedContent.criticalNotes
              ? `${generatedContent.criticalNotes}\n\n--- Validação Curricular (score: ${seqResult.score}/10, cobertura: ${seqResult.coveragePercent}%) ---\n${seqNotes}`
              : `--- Validação Curricular (score: ${seqResult.score}/10, cobertura: ${seqResult.coveragePercent}%) ---\n${seqNotes}`;
          }
        } catch {
          // Non-critical — proceed without curriculum validation
        }
      }

      // ★ Annual plan curriculum validation: prerequisite ordering across trimesters[]
      // Only runs when trimesters[] is fully structured (length === 3) — not on legacy flat plans
      if (
        input.type === PlanType.ANNUAL &&
        generatedContent.trimesters &&
        generatedContent.trimesters.length === 3 &&
        input.dosificacao?.content
      ) {
        try {
          const graph = this.curriculumIntelligence.buildGraph(sanitizeDosificacaoContent(input.dosificacao.content));
          const orderedTopics = [...generatedContent.trimesters]
            .sort((a, b) => a.number - b.number)
            .flatMap(t => t.topics);
          const seqResult = this.curriculumIntelligence.validateTopicSequence(orderedTopics, graph);
          const errors = seqResult.violations.filter(v => v.severity === 'error');
          if (errors.length > 0) {
            const seqNotes = errors
              .map(v =>
                `[ERROR] Ordem curricular inválida: "${v.topicContent.substring(0, 60)}" requer pré-requisito(s): ${v.missingPrerequisites.map(m => `"${m.content.substring(0, 40)}"`).join(', ')}.`,
              )
              .join('\n');
            generatedContent.criticalNotes = generatedContent.criticalNotes
              ? `${generatedContent.criticalNotes}\n\n--- Validação Curricular (Plano Anual, score: ${seqResult.score}/10) ---\n${seqNotes}`
              : `--- Validação Curricular (Plano Anual, score: ${seqResult.score}/10) ---\n${seqNotes}`;
          }
        } catch {
          // Non-critical — proceed without annual curriculum validation
        }
      }

      // ★ Deterministic Post-Correction: fix known issues without re-calling AI
      // Uses the calendar snapshot captured at plan creation for determinism.
      // Falls back to live calendarContext if snapshot is missing (pre-existing plans).
      let postCorrectionApplied = false;
      if (generatedContent.weeklyPlan && generatedContent.weeklyPlan.length > 0) {
        try {
          const currentPlanForSnapshot = await this.planRepository.findById(planId);
          const snapshot = currentPlanForSnapshot?.calendarSnapshot as CalendarContext | undefined;
          const calendarForCorrection = (snapshot?.terms && snapshot?.events)
            ? snapshot
            : validationCtx.calendarContext;

          if (calendarForCorrection) {
            const correction = this.postCorrection.correct(
              generatedContent,
              calendarForCorrection,
              validationCtx.trimester,
              input.type === PlanType.TRIMESTER ? (input as { lessonsPerWeek?: number }).lessonsPerWeek : undefined,
              curriculumViolations.length > 0 ? curriculumViolations : undefined,
            );
            if (correction.corrected) {
              Object.assign(generatedContent, correction.content);
              postCorrectionApplied = true;
            }
          }
        } catch {
          // Non-critical — proceed with uncorrected content
        }
      }

      // Re-validate on corrected content so plan STATUS reflects the final output, not the
      // pre-correction draft. Calendar-related errors (WEEK_COUNT_MISMATCH, PEDAGOGICAL_SEQUENCE_WEAK)
      // are frequently fixed by post-correction — without this re-run, a corrected plan would be
      // incorrectly saved as DRAFT.
      let finalValidation = validation;
      if (postCorrectionApplied) {
        try {
          finalValidation = this.validator.validate({
            planType: input.type,
            generatedContent,
            parentPlanContent: validationCtx.parentPlanContent,
            siblingPlanSummaries: validationCtx.siblingPlanSummaries.length > 0
              ? validationCtx.siblingPlanSummaries
              : undefined,
            calendarContext: validationCtx.calendarContext || undefined,
            trimester: validationCtx.trimester,
            dosificacaoContent: input.dosificacao?.content,
          });
        } catch {
          // Non-critical — fall back to pre-correction validation for status
        }
      }

      // Compute quality scores
      let qualityScores: import('@/src/domain/entities/plan.entity').PlanQualityScores | undefined;
      try {
        const currentPlan = await this.planRepository.findById(planId);
        const siblingPlans = await this.planRepository.findByDosificacaoId(
          currentPlan?.dosificacaoId || '',
        );
        const parentPlan = validationCtx.parentPlanId
          ? await this.planRepository.findById(validationCtx.parentPlanId)
          : undefined;
        const tempPlan = { content: generatedContent, type: input.type, trimester: validationCtx.trimester } as Plan;
        const qualityReport = this.qualityService.evaluate(
          tempPlan,
          siblingPlans.filter(p => p.id !== planId && p.id !== validationCtx.parentPlanId),
          parentPlan || undefined,
          validationCtx.calendarContext || undefined,
          validationCtx.teachingHistoryContext || undefined,
        );
        qualityScores = qualityReport.scores;

        // Attach non-blocking pedagogical feedback to the plan content for teacher visibility.
        // Only surface warnings and errors — success insights are noise at this level.
        const feedbackMessages = qualityReport.insights
          .filter(i => i.type === 'warning' || i.type === 'error')
          .map(i => i.message);
        if (feedbackMessages.length > 0) {
          generatedContent.feedback = feedbackMessages;
        }
      } catch (scoringError) {
        // Quality scoring failed — use a below-threshold default to ensure the feedback loop still triggers
        qualityScores = {
          coherenceScore: 0,
          workloadBalanceScore: 0,
          calendarAlignmentScore: 0,
          overallScore: 0,
          qualityScore100: 0,
          qualityLabel: 'unverified',
          evaluatedAt: new Date().toISOString(),
        };
        generatedContent.criticalNotes = generatedContent.criticalNotes
          ? `${generatedContent.criticalNotes}\n\n--- Aviso ---\nScoring de qualidade falhou: ${scoringError instanceof Error ? scoringError.message : 'Erro desconhecido'}. Plano será reavaliado.`
          : `--- Aviso ---\nScoring de qualidade falhou: ${scoringError instanceof Error ? scoringError.message : 'Erro desconhecido'}. Plano será reavaliado.`;
      }

      // Keep the best result
      const isFirstAttempt = attempt === 0;
      const isBetterThanBest = !bestScores || (qualityScores && qualityScores.overallScore > bestScores.overallScore);

      if (isFirstAttempt || isBetterThanBest) {
        bestContent = generatedContent;
        bestScores = qualityScores;
        bestValidation = finalValidation; // uses post-correction result when available
      }

      // Decide whether to retry
      if (attempt < MAX_RETRIES && qualityScores && qualityScores.overallScore < AI_RETRY_THRESHOLD) {
        retryUsed = true;
        continue; // Retry with feedback
      }

      break; // Score is good enough or max retries reached
    }

    if (!bestContent || !bestValidation) return;

    // Add retry note if applicable
    if (retryUsed && bestScores) {
      bestContent.criticalNotes = bestContent.criticalNotes
        ? `${bestContent.criticalNotes}\n\n--- Auto-Retry ---\nPlano regenerado automaticamente (score final: ${bestScores.overallScore}/10).`
        : `--- Auto-Retry ---\nPlano regenerado automaticamente (score final: ${bestScores.overallScore}/10).`;
    }

    // T2.8: Re-check calendar version after generation to detect mid-generation changes
    const currentPlan = await this.planRepository.findById(planId);
    if (currentPlan?.calendarId && validationCtx.calendarContext) {
      try {
        const freshCalendar = await this.schoolCalendarRepository.findById(currentPlan.calendarId);
        if (freshCalendar && currentPlan.calendarVersion && freshCalendar.version !== currentPlan.calendarVersion) {
          bestContent.criticalNotes = bestContent.criticalNotes
            ? `${bestContent.criticalNotes}\n\n--- Aviso ---\nO calendário foi alterado durante a geração (v${currentPlan.calendarVersion} → v${freshCalendar.version}). Considere regenerar este plano.`
            : `--- Aviso ---\nO calendário foi alterado durante a geração (v${currentPlan.calendarVersion} → v${freshCalendar.version}). Considere regenerar este plano.`;
        }
      } catch {
        // Non-critical — proceed with save
      }
    }

    await this.planRepository.update(planId, {
      content: bestContent,
      status: bestValidation.valid ? PlanStatus.GENERATED : PlanStatus.DRAFT,
      ...(bestScores ? { qualityScores: bestScores } : {}),
    });
  }
}
