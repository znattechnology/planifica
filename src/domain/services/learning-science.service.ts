import { WeeklyPlanItem } from '@/src/domain/entities/plan.entity';
import { CurriculumGraph, CurriculumNode, BloomLevel } from './curriculum-intelligence.service';
import { normalizeText } from '@/src/ai/config';

// ─── Types ───────────────────────────────────────────────

export interface SpacedReviewSlot {
  weekNumber: number;
  topicId: string;
  topicContent: string;
  daysSinceIntroduction: number;
  reviewType: 'retrieval_practice' | 'interleaved_review' | 'cumulative_assessment';
  suggestedActivity: string;
}

export interface CognitiveLoadAnalysis {
  weekNumber: number;
  intrinsicLoad: number;    // 1-10: inherent topic difficulty
  germanLoad: number;       // 1-10: extraneous load from presentation/method
  totalLoad: number;        // 1-10: combined
  isOverloaded: boolean;    // totalLoad > 7
  suggestion?: string;
}

export interface LearningOptimizationResult {
  spacedReviews: SpacedReviewSlot[];
  cognitiveLoadProfile: CognitiveLoadAnalysis[];
  overloadedWeeks: number[];
  averageWeeklyCognitiveLoad: number;
  /** Formatted instructions to inject into AI prompt */
  aiInstructions: string;
}

// ─── Constants ──────────────────────────────────────────

/**
 * Optimal review intervals based on Ebbinghaus forgetting curve.
 * After introduction: review at +1 week, +3 weeks, +7 weeks.
 */
const REVIEW_INTERVALS_WEEKS = [1, 3, 7];

/**
 * Maximum cognitive load per week (1-10 scale).
 * Based on Sweller's Cognitive Load Theory:
 * - Weeks after exam: reduced load (recovery)
 * - Weeks with new difficult topics: cap at 7
 * - Normal weeks: cap at 8
 */
const MAX_COGNITIVE_LOAD = 7;

/**
 * Bloom level to intrinsic cognitive load mapping.
 */
const BLOOM_TO_LOAD: Record<number, number> = {
  [BloomLevel.REMEMBER]: 2,
  [BloomLevel.UNDERSTAND]: 3,
  [BloomLevel.APPLY]: 5,
  [BloomLevel.ANALYZE]: 7,
  [BloomLevel.EVALUATE]: 8,
  [BloomLevel.CREATE]: 9,
};

// ─── Service ────────────────────────────────────────────

/**
 * Learning Science Service.
 *
 * Applies evidence-based learning principles to plan optimization:
 * 1. Spaced repetition scheduling (Ebbinghaus)
 * 2. Cognitive load balancing (Sweller)
 * 3. Interleaving recommendations
 * 4. Retrieval practice injection
 *
 * This service generates INSTRUCTIONS that are:
 * - Injected into the AI prompt (pre-generation)
 * - Used for post-generation validation
 * - Surfaced to teachers as insights
 */
export class LearningScienceService {

  /**
   * Analyze a weekly plan and generate learning science optimizations.
   *
   * @deprecated Not connected to the generation pipeline. `buildPreGenerationHints`
   * is the only method currently used. Connect this to a post-generation quality pass
   * before removing the deprecation marker.
   */
  analyze(
    weeklyPlan: WeeklyPlanItem[],
    graph: CurriculumGraph,
    examWeeks: number[] = [],
  ): LearningOptimizationResult {
    // Map each week to its curriculum nodes
    const weekNodeMap = this.mapWeeksToNodes(weeklyPlan, graph);

    // 1. Generate spaced review schedule
    const spacedReviews = this.computeSpacedReviews(weeklyPlan, weekNodeMap, graph, examWeeks);

    // 2. Compute cognitive load per week
    const cognitiveLoadProfile = this.computeCognitiveLoad(weeklyPlan, weekNodeMap, graph, examWeeks);
    const overloadedWeeks = cognitiveLoadProfile
      .filter(w => w.isOverloaded)
      .map(w => w.weekNumber);
    const avgLoad = cognitiveLoadProfile.length > 0
      ? Math.round((cognitiveLoadProfile.reduce((s, w) => s + w.totalLoad, 0) / cognitiveLoadProfile.length) * 10) / 10
      : 0;

    // 3. Build AI instructions
    const aiInstructions = this.buildAIInstructions(spacedReviews, cognitiveLoadProfile, overloadedWeeks);

    return {
      spacedReviews,
      cognitiveLoadProfile,
      overloadedWeeks,
      averageWeeklyCognitiveLoad: avgLoad,
      aiInstructions,
    };
  }

  /**
   * Generate pre-generation instructions for the AI prompt.
   * Call this BEFORE AI generation to inject learning science constraints.
   */
  buildPreGenerationHints(
    graph: CurriculumGraph,
    availableWeeks: number,
    examWeeks: number[],
  ): string {
    const parts: string[] = [];

    parts.push('══ CIÊNCIA DA APRENDIZAGEM ══');

    // Difficulty curve guidance
    const avgDifficulty = graph.averageDifficulty;
    if (avgDifficulty > 3) {
      parts.push(`Dificuldade média dos conteúdos: ${avgDifficulty}/5 (elevada).`);
      parts.push('INSTRUÇÃO: Começar com temas de menor complexidade e progredir gradualmente.');
      parts.push('Evitar colocar 2+ temas de dificuldade 4-5 na mesma semana.');
    }

    // Review spacing
    if (availableWeeks >= 6) {
      parts.push('');
      parts.push('REVISÃO ESPAÇADA (baseado na curva de esquecimento):');
      parts.push('- Após introduzir um tema importante, incluir breve revisão ~1 semana depois.');
      parts.push('- Antes de cada avaliação, incluir semana de revisão cumulativa.');
      parts.push('- Intercalar prática de temas anteriores com novos (interleaving).');
    }

    // Exam preparation
    if (examWeeks.length > 0) {
      parts.push('');
      parts.push('PREPARAÇÃO PARA AVALIAÇÕES:');
      for (const ew of examWeeks) {
        parts.push(`- Semana ${ew}: avaliação. Semana ${ew - 1}: REVISÃO obrigatória. Semana ${ew + 1}: carga reduzida (recuperação cognitiva).`);
      }
    }

    // Cognitive load
    parts.push('');
    parts.push('CARGA COGNITIVA:');
    parts.push('- Máximo 2 conceitos novos complexos por semana.');
    parts.push('- Alternar semanas de conteúdo denso com semanas de prática/consolidação.');
    parts.push('- Não introduzir conceito complexo logo após avaliação.');

    return parts.join('\n');
  }

  // ─── Private methods ──────────────────────────────────

  private mapWeeksToNodes(
    weeklyPlan: WeeklyPlanItem[],
    graph: CurriculumGraph,
  ): Map<number, CurriculumNode[]> {
    const map = new Map<number, CurriculumNode[]>();

    for (let w = 0; w < weeklyPlan.length; w++) {
      const weekContent = normalizeText(weeklyPlan[w].contents);
      const matched: CurriculumNode[] = [];

      for (const node of graph.nodes) {
        const nodeContent = normalizeText(node.content);
        // Match if significant overlap exists
        const nodeTerms = nodeContent.split(/\s+/).filter(t => t.length >= 4);
        const matchCount = nodeTerms.filter(term => weekContent.includes(term)).length;
        if (nodeTerms.length > 0 && matchCount / nodeTerms.length >= 0.3) {
          matched.push(node);
        }
      }

      map.set(w, matched);
    }

    return map;
  }

  private computeSpacedReviews(
    weeklyPlan: WeeklyPlanItem[],
    weekNodeMap: Map<number, CurriculumNode[]>,
    graph: CurriculumGraph,
    examWeeks: number[],
  ): SpacedReviewSlot[] {
    const reviews: SpacedReviewSlot[] = [];
    const totalWeeks = weeklyPlan.length;

    // For each week where a topic is introduced
    for (const [weekIdx, nodes] of weekNodeMap) {
      for (const node of nodes) {
        // Only schedule reviews for topics with difficulty >= 3
        if (node.difficulty < 3) continue;

        for (const interval of REVIEW_INTERVALS_WEEKS) {
          const reviewWeek = weekIdx + interval;
          if (reviewWeek >= totalWeeks) break;

          // Don't schedule reviews on exam weeks
          if (examWeeks.includes(reviewWeek + 1)) continue;

          // Determine review type
          let reviewType: SpacedReviewSlot['reviewType'] = 'retrieval_practice';
          if (interval >= 3) reviewType = 'interleaved_review';

          // Check if there's an upcoming exam
          const nearExam = examWeeks.some(ew => ew === reviewWeek + 2);
          if (nearExam) reviewType = 'cumulative_assessment';

          reviews.push({
            weekNumber: reviewWeek + 1, // 1-based
            topicId: node.id,
            topicContent: node.content,
            daysSinceIntroduction: interval * 7,
            reviewType,
            suggestedActivity: this.suggestReviewActivity(reviewType, node),
          });
        }
      }
    }

    // Deduplicate and limit reviews per week (max 2)
    const byWeek = new Map<number, SpacedReviewSlot[]>();
    for (const review of reviews) {
      const existing = byWeek.get(review.weekNumber) || [];
      existing.push(review);
      byWeek.set(review.weekNumber, existing);
    }

    const deduped: SpacedReviewSlot[] = [];
    for (const [, weekReviews] of byWeek) {
      // Keep the 2 most important (highest difficulty first)
      const sorted = weekReviews.sort((a, b) => {
        const nodeA = graph.nodes.find(n => n.id === a.topicId);
        const nodeB = graph.nodes.find(n => n.id === b.topicId);
        return (nodeB?.difficulty || 0) - (nodeA?.difficulty || 0);
      });
      deduped.push(...sorted.slice(0, 2));
    }

    return deduped;
  }

  private computeCognitiveLoad(
    weeklyPlan: WeeklyPlanItem[],
    weekNodeMap: Map<number, CurriculumNode[]>,
    graph: CurriculumGraph,
    examWeeks: number[],
  ): CognitiveLoadAnalysis[] {
    const analyses: CognitiveLoadAnalysis[] = [];

    for (let w = 0; w < weeklyPlan.length; w++) {
      const nodes = weekNodeMap.get(w) || [];
      const week = weeklyPlan[w];

      // Intrinsic load: based on topic difficulty and Bloom's level
      let intrinsicLoad = 1;
      if (nodes.length > 0) {
        const maxBloomLoad = Math.max(...nodes.map(n => BLOOM_TO_LOAD[n.bloomLevel] || 3));
        const avgDifficulty = nodes.reduce((s, n) => s + n.difficulty, 0) / nodes.length;
        intrinsicLoad = Math.round((maxBloomLoad * 0.6 + avgDifficulty * 2 * 0.4) * 10) / 10;
        intrinsicLoad = Math.min(10, Math.max(1, intrinsicLoad));
      }

      // Germane load: presentation complexity
      // More lessons = more mental switching, multi-topic weeks = higher
      const topicCount = nodes.length;
      const lessonDensity = week.numLessons / 2; // normalized to typical 2 lessons/week
      let germanLoad = Math.round((topicCount * 1.5 + lessonDensity * 2) * 10) / 10;
      germanLoad = Math.min(10, Math.max(1, germanLoad));

      // Post-exam recovery: reduce expected load
      const isPostExam = examWeeks.includes(w); // week after exam
      if (isPostExam) {
        germanLoad = Math.max(1, germanLoad - 2);
      }

      const totalLoad = Math.round(((intrinsicLoad * 0.7 + germanLoad * 0.3)) * 10) / 10;
      const isOverloaded = totalLoad > MAX_COGNITIVE_LOAD;

      let suggestion: string | undefined;
      if (isOverloaded) {
        if (topicCount > 1) {
          suggestion = `Semana ${w + 1}: carga cognitiva elevada (${totalLoad}/10). Considere mover um tema para a semana seguinte.`;
        } else {
          suggestion = `Semana ${w + 1}: tema complexo (${totalLoad}/10). Adicione actividades de scaffolding (exemplos guiados, exercícios progressivos).`;
        }
      }

      analyses.push({
        weekNumber: w + 1,
        intrinsicLoad,
        germanLoad,
        totalLoad,
        isOverloaded,
        suggestion,
      });
    }

    return analyses;
  }

  private suggestReviewActivity(type: SpacedReviewSlot['reviewType'], node: CurriculumNode): string {
    switch (type) {
      case 'retrieval_practice':
        return `Mini-teste oral (5 min) sobre "${node.content.substring(0, 50)}". Sem consulta — activar memória.`;
      case 'interleaved_review':
        return `Exercício misto: combinar "${node.content.substring(0, 40)}" com conteúdo recente. Prática intercalada.`;
      case 'cumulative_assessment':
        return `Exercício de preparação para prova incluindo "${node.content.substring(0, 40)}".`;
    }
  }

  private buildAIInstructions(
    reviews: SpacedReviewSlot[],
    loadProfile: CognitiveLoadAnalysis[],
    overloadedWeeks: number[],
  ): string {
    const parts: string[] = [];

    if (reviews.length > 0) {
      parts.push('══ REVISÃO ESPAÇADA (AUTO-CALCULADA) ══');
      const byWeek = new Map<number, SpacedReviewSlot[]>();
      for (const r of reviews) {
        const existing = byWeek.get(r.weekNumber) || [];
        existing.push(r);
        byWeek.set(r.weekNumber, existing);
      }
      for (const [weekNum, weekReviews] of [...byWeek].sort((a, b) => a[0] - b[0])) {
        const items = weekReviews.map(r =>
          `"${r.topicContent.substring(0, 50)}" (${r.daysSinceIntroduction} dias após introdução)`,
        );
        parts.push(`  Semana ${weekNum}: incluir revisão de ${items.join('; ')}`);
      }
    }

    if (overloadedWeeks.length > 0) {
      parts.push('');
      parts.push('══ ALERTAS DE CARGA COGNITIVA ══');
      for (const weekNum of overloadedWeeks) {
        const analysis = loadProfile.find(l => l.weekNumber === weekNum);
        if (analysis?.suggestion) {
          parts.push(`  ${analysis.suggestion}`);
        }
      }
    }

    return parts.length > 0 ? parts.join('\n') : '';
  }
}
