import { Plan, PlanType, PlanStatus, PlanContent } from '@/src/domain/entities/plan.entity';
import { IPlanRepository } from '@/src/domain/interfaces/repositories/plan.repository';
import { IDosificacaoRepository } from '@/src/domain/interfaces/repositories/dosificacao.repository';
import { ISchoolCalendarRepository } from '@/src/domain/interfaces/repositories/school-calendar.repository';
import {
  IAIPlanGeneratorService,
  GeneratePlanInput,
  CalendarContext,
  SiblingPlanSummary,
  FocusWeekData,
} from '@/src/domain/interfaces/services/ai-plan-generator.service';
import { SchoolCalendar, CalendarEventType } from '@/src/domain/entities/school-calendar.entity';
import { EntityNotFoundError } from '@/src/domain/errors/domain.error';
import { PlanValidationService } from '@/src/ai/services/plan-validation.service';
import { PlanQualityService } from '@/src/ai/services/plan-quality.service';
import { TeachingHistoryService } from '@/src/ai/services/teaching-history.service';
import { ILessonRepository } from '@/src/domain/interfaces/repositories/lesson.repository';
import { ITeachingActivityRepository } from '@/src/domain/interfaces/repositories/teaching-activity.repository';
import { calculateEffectiveTeachingWeeks, extractWeeksFromParent } from '@/src/shared/utils/teaching-weeks';

const CALENDAR_EVENT_TYPES_FOR_PLANS = [
  CalendarEventType.NATIONAL_HOLIDAY,
  CalendarEventType.SCHOOL_HOLIDAY,
  CalendarEventType.TRIMESTER_BREAK,
  CalendarEventType.EXAM_PERIOD,
  CalendarEventType.MAKEUP_EXAM,
  CalendarEventType.PEDAGOGICAL_ACTIVITY,
];

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
}

export class GeneratePlanUseCase {
  private readonly validator = new PlanValidationService();
  private readonly qualityService = new PlanQualityService();
  private readonly teachingHistoryService: TeachingHistoryService;

  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly dosificacaoRepository: IDosificacaoRepository,
    private readonly aiService: IAIPlanGeneratorService,
    private readonly schoolCalendarRepository: ISchoolCalendarRepository,
    private readonly lessonRepository?: ILessonRepository,
    private readonly activityRepository?: ITeachingActivityRepository,
  ) {
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
    const calendarContext = await this.fetchCalendarContext(input.userId, dosificacao.academicYear, input.trimester);

    // Fetch sibling plans for continuity awareness
    const siblingPlanSummaries = await this.fetchSiblingPlanSummaries(dosificacaoId, input.type);

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
      dosificacaoId,
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
      calendarContext: calendarContext || undefined,
      siblingPlanSummaries: siblingPlanSummaries.length > 0 ? siblingPlanSummaries : undefined,
      teachingHistory: teachingHistory || undefined,
    }, {
      parentPlanContent,
      parentPlanId: input.parentPlanId,
      siblingPlanSummaries,
      calendarContext,
      trimester: input.trimester,
      teachingHistoryContext,
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

  private async fetchCalendarContext(
    userId: string,
    academicYear: string,
    trimester?: number,
  ): Promise<CalendarContext | null> {
    try {
      const calendar = await this.schoolCalendarRepository.findByUserAndYear(userId, academicYear);
      if (!calendar) return null;
      return this.toCalendarContext(calendar, trimester);
    } catch {
      return null;
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
    },
  ): void {
    this.aiService
      .generatePlan(input)
      .then(async (generatedContent) => {
        // Post-generation validation
        const validation = this.validator.validate({
          planType: input.type,
          generatedContent,
          parentPlanContent: validationCtx.parentPlanContent,
          siblingPlanSummaries: validationCtx.siblingPlanSummaries.length > 0
            ? validationCtx.siblingPlanSummaries
            : undefined,
          calendarContext: validationCtx.calendarContext || undefined,
          trimester: validationCtx.trimester,
        });

        // Store validation notes even on success
        if (validation.issues.length > 0) {
          const notes = validation.issues
            .map(i => `[${i.severity.toUpperCase()}] ${i.code}: ${i.message}`)
            .join('\n');
          generatedContent.criticalNotes = generatedContent.criticalNotes
            ? `${generatedContent.criticalNotes}\n\n--- Validação ---\n${notes}`
            : `--- Validação ---\n${notes}`;
        }

        // Compute quality scores
        let qualityScores;
        try {
          const currentPlan = await this.planRepository.findById(planId);
          const siblingPlans = await this.planRepository.findByDosificacaoId(
            currentPlan?.dosificacaoId || '',
          );
          // Fetch parent plan separately — it may have a different dosificacaoId
          const parentPlan = validationCtx.parentPlanId
            ? await this.planRepository.findById(validationCtx.parentPlanId)
            : undefined;
          const tempPlan = { content: generatedContent, type: input.type, trimester: validationCtx.trimester } as import('@/src/domain/entities/plan.entity').Plan;
          const qualityReport = this.qualityService.evaluate(
            tempPlan,
            siblingPlans.filter(p => p.id !== planId && p.id !== validationCtx.parentPlanId),
            parentPlan || undefined,
            validationCtx.calendarContext || undefined,
            validationCtx.teachingHistoryContext || undefined,
          );
          qualityScores = qualityReport.scores;
        } catch {
          // Quality scoring is non-critical
        }

        await this.planRepository.update(planId, {
          content: generatedContent,
          status: validation.valid ? PlanStatus.GENERATED : PlanStatus.DRAFT,
          ...(qualityScores ? { qualityScores } : {}),
        });
      })
      .catch(async (error) => {
        await this.planRepository.update(planId, {
          status: PlanStatus.DRAFT,
          content: {
            generalObjectives: [],
            specificObjectives: [],
            competencies: [],
            topics: [],
            criticalNotes: `Erro na geração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          },
        });
      });
  }
}
