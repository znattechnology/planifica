import { Plan, PlanType, PlanStatus, PlanContent } from '@/src/domain/entities/plan.entity';
import { CalendarContext } from '@/src/domain/interfaces/services/ai-plan-generator.service';

export interface CoherenceIssue {
  severity: 'error' | 'warning' | 'info';
  area: 'progression' | 'continuity' | 'workload' | 'gaps' | 'calendar';
  message: string;
}

export interface CoherenceReport {
  score: number; // 1-10
  issues: CoherenceIssue[];
  summary: string;
}

/**
 * Analyzes coherence across a full cascade of plans
 * for a given dosificação/subject.
 */
export class PlanCoherenceService {
  analyze(
    plans: Plan[],
    calendarContext?: CalendarContext,
  ): CoherenceReport {
    const issues: CoherenceIssue[] = [];

    const annualPlans = plans.filter(p => p.type === PlanType.ANNUAL && p.status === PlanStatus.GENERATED);
    const trimesterPlans = plans.filter(p => p.type === PlanType.TRIMESTER && p.status === PlanStatus.GENERATED);
    const biweeklyPlans = plans.filter(p => p.type === PlanType.BIWEEKLY && p.status === PlanStatus.GENERATED);
    const lessonPlans = plans.filter(p => p.type === PlanType.LESSON && p.status === PlanStatus.GENERATED);

    // 1. Check trimester progression
    issues.push(...this.checkTrimesterProgression(trimesterPlans));

    // 2. Check topic continuity (no duplicates across trimesters)
    issues.push(...this.checkTopicContinuity(trimesterPlans));

    // 3. Check workload balance across trimesters
    issues.push(...this.checkWorkloadBalance(trimesterPlans, calendarContext));

    // 4. Check content gaps (annual topics covered by trimesters)
    if (annualPlans.length > 0 && trimesterPlans.length > 0) {
      issues.push(...this.checkContentCoverage(annualPlans[0], trimesterPlans));
    }

    // 5. Check plan hierarchy consistency
    issues.push(...this.checkHierarchyConsistency(plans));

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(1, Math.min(10, 10 - errorCount * 2 - warningCount * 0.5));

    return {
      score: Math.round(score * 10) / 10,
      issues,
      summary: this.buildSummary(issues, trimesterPlans.length, biweeklyPlans.length, lessonPlans.length),
    };
  }

  private checkTrimesterProgression(trimesters: Plan[]): CoherenceIssue[] {
    const issues: CoherenceIssue[] = [];
    if (trimesters.length < 2) return issues;

    // Sort by title to approximate trimester order
    const sorted = [...trimesters].sort((a, b) => a.title.localeCompare(b.title));

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].content;
      const curr = sorted[i].content;

      // Check that current trimester has different topics from previous
      const prevTopics = new Set((prev.topics || []).map(t => t.title.toLowerCase().trim()));
      const currTopics = (curr.topics || []).map(t => t.title.toLowerCase().trim());

      const overlapping = currTopics.filter(t => prevTopics.has(t));
      if (overlapping.length > 0) {
        issues.push({
          severity: 'warning',
          area: 'progression',
          message: `Temas repetidos entre trimestres: ${overlapping.join(', ')}`,
        });
      }
    }

    return issues;
  }

  private checkTopicContinuity(trimesters: Plan[]): CoherenceIssue[] {
    const issues: CoherenceIssue[] = [];
    const allTopics = new Map<string, string[]>();

    for (const plan of trimesters) {
      for (const topic of plan.content.topics || []) {
        const key = topic.title.toLowerCase().trim();
        if (!allTopics.has(key)) allTopics.set(key, []);
        allTopics.get(key)!.push(plan.title);
      }
    }

    for (const [topic, plans] of allTopics) {
      if (plans.length > 1) {
        issues.push({
          severity: 'warning',
          area: 'continuity',
          message: `Tema "${topic}" aparece em ${plans.length} planos: ${plans.join(', ')}`,
        });
      }
    }

    return issues;
  }

  private checkWorkloadBalance(trimesters: Plan[], calendar?: CalendarContext): CoherenceIssue[] {
    const issues: CoherenceIssue[] = [];
    if (trimesters.length < 2) return issues;

    const weekCounts = trimesters.map(p => p.content.weeklyPlan?.length || 0);
    const lessonCounts = trimesters.map(p => p.content.totalLessons || 0);

    // Check if any trimester has significantly more/fewer weeks
    const avgWeeks = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
    for (let i = 0; i < weekCounts.length; i++) {
      if (weekCounts[i] > 0 && Math.abs(weekCounts[i] - avgWeeks) > 3) {
        issues.push({
          severity: 'warning',
          area: 'workload',
          message: `${trimesters[i].title} tem ${weekCounts[i]} semanas (média: ${Math.round(avgWeeks)}). Possível desequilíbrio.`,
        });
      }
    }

    // Check against calendar if available
    if (calendar) {
      for (const plan of trimesters) {
        const weekCount = plan.content.weeklyPlan?.length || 0;
        if (weekCount === 0) continue;

        // Try to match plan to a calendar term
        const matchedTerm = calendar.terms.find(t => {
          const planTitle = plan.title.toLowerCase();
          return planTitle.includes(`${t.trimester}º`) || planTitle.includes(`${t.trimester}°`);
        });

        if (matchedTerm && Math.abs(weekCount - matchedTerm.teachingWeeks) > 2) {
          issues.push({
            severity: 'error',
            area: 'calendar',
            message: `${plan.title}: ${weekCount} semanas no plano vs ${matchedTerm.teachingWeeks} no calendário.`,
          });
        }
      }
    }

    return issues;
  }

  private checkContentCoverage(annual: Plan, trimesters: Plan[]): CoherenceIssue[] {
    const issues: CoherenceIssue[] = [];

    const annualTopics = new Set((annual.content.topics || []).map(t => t.title.toLowerCase().trim()));
    const coveredTopics = new Set(
      trimesters.flatMap(p => (p.content.topics || []).map(t => t.title.toLowerCase().trim())),
    );

    const uncovered = [...annualTopics].filter(t => {
      return ![...coveredTopics].some(ct => ct.includes(t) || t.includes(ct));
    });

    if (uncovered.length > 0) {
      issues.push({
        severity: 'error',
        area: 'gaps',
        message: `Temas do plano anual não cobertos por nenhum trimestre: ${uncovered.join(', ')}`,
      });
    }

    return issues;
  }

  private checkHierarchyConsistency(plans: Plan[]): CoherenceIssue[] {
    const issues: CoherenceIssue[] = [];
    const planMap = new Map(plans.map(p => [p.id, p]));

    for (const plan of plans) {
      if (plan.parentPlanId && planMap.has(plan.parentPlanId)) {
        const parent = planMap.get(plan.parentPlanId)!;
        if (plan.subject !== parent.subject) {
          issues.push({
            severity: 'error',
            area: 'continuity',
            message: `${plan.title} (${plan.subject}) tem pai ${parent.title} (${parent.subject}) — disciplinas diferentes.`,
          });
        }
      }
    }

    return issues;
  }

  private buildSummary(
    issues: CoherenceIssue[],
    trimCount: number,
    biweeklyCount: number,
    lessonCount: number,
  ): string {
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

    if (errors === 0 && warnings === 0) {
      return `Cascata coerente: ${trimCount} planos trimestrais, ${biweeklyCount} quinzenais, ${lessonCount} planos de aula. Sem problemas detectados.`;
    }

    return `Análise: ${errors} erro(s), ${warnings} aviso(s) em ${trimCount} trimestrais, ${biweeklyCount} quinzenais, ${lessonCount} planos de aula.`;
  }
}
