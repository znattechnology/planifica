import { DosificacaoContent, DosificacaoUnidade, DosificacaoTopico } from '@/src/domain/entities/dosificacao.entity';
import { normalizeText } from '@/src/ai/config';

// ─── Types ───────────────────────────────────────────────

/**
 * A node in the curriculum prerequisite graph.
 * Each node represents a topic within a didactic unit.
 */
export interface CurriculumNode {
  id: string;           // normalized topic identifier
  unitIndex: number;    // unit position in dosificação (0-based)
  topicIndex: number;   // topic position within unit (0-based)
  unitName: string;
  content: string;      // raw content text
  objectives: string;
  numAulas: number;
  /** Inferred difficulty: 1 (introductory) to 5 (advanced) */
  difficulty: number;
  /** Bloom's cognitive level inferred from objectives */
  bloomLevel: BloomLevel;
  /** IDs of prerequisite nodes (must be taught before this one) */
  prerequisites: string[];
  /** IDs of nodes that depend on this one */
  dependents: string[];
}

export enum BloomLevel {
  REMEMBER = 1,       // Conhecer, Identificar, Listar
  UNDERSTAND = 2,     // Compreender, Explicar, Descrever
  APPLY = 3,          // Aplicar, Resolver, Calcular
  ANALYZE = 4,        // Analisar, Comparar, Distinguir
  EVALUATE = 5,       // Avaliar, Justificar, Argumentar
  CREATE = 6,         // Criar, Projectar, Elaborar
}

export interface CurriculumGraph {
  nodes: CurriculumNode[];
  /** Topologically sorted node IDs (valid teaching order) */
  sortedOrder: string[];
  /** Total estimated lessons across all nodes */
  totalLessons: number;
  /** Average difficulty across nodes */
  averageDifficulty: number;
}

export interface SequenceViolation {
  topicId: string;
  topicContent: string;
  weekNumber: number;
  missingPrerequisites: { id: string; content: string }[];
  severity: 'error' | 'warning';
  message: string;
}

export interface CurriculumValidationResult {
  violations: SequenceViolation[];
  score: number; // 0-10
  coveragePercent: number;
  difficultyProgression: 'ascending' | 'mixed' | 'descending';
}

// ─── Bloom's Detection (Portuguese) ─────────────────────

const BLOOM_MARKERS: { level: BloomLevel; markers: string[] }[] = [
  {
    level: BloomLevel.CREATE,
    markers: ['criar', 'projectar', 'elaborar', 'construir', 'produzir', 'inventar', 'formular', 'planificar'],
  },
  {
    level: BloomLevel.EVALUATE,
    markers: ['avaliar', 'justificar', 'argumentar', 'julgar', 'criticar', 'defender', 'fundamentar'],
  },
  {
    level: BloomLevel.ANALYZE,
    markers: ['analisar', 'comparar', 'distinguir', 'diferenciar', 'examinar', 'categorizar', 'contrastar', 'investigar'],
  },
  {
    level: BloomLevel.APPLY,
    markers: ['aplicar', 'resolver', 'calcular', 'utilizar', 'demonstrar', 'executar', 'praticar', 'implementar'],
  },
  {
    level: BloomLevel.UNDERSTAND,
    markers: ['compreender', 'explicar', 'descrever', 'interpretar', 'resumir', 'classificar', 'exemplificar', 'traduzir'],
  },
  {
    level: BloomLevel.REMEMBER,
    markers: ['conhecer', 'identificar', 'listar', 'definir', 'memorizar', 'reconhecer', 'nomear', 'enumerar', 'recordar'],
  },
];

// ─── Difficulty inference markers ───────────────────────

const DIFFICULTY_MARKERS: { level: number; markers: string[] }[] = [
  { level: 5, markers: ['demonstração', 'prova', 'derivação', 'integração', 'teorema', 'axioma', 'complexo'] },
  { level: 4, markers: ['analisar', 'sistema', 'equação', 'função composta', 'transformação', 'abstracto'] },
  { level: 3, markers: ['resolver', 'calcular', 'aplicar', 'problema', 'exercício', 'representar graficamente'] },
  { level: 2, markers: ['compreender', 'explicar', 'classificar', 'relacionar', 'descrever propriedades'] },
  { level: 1, markers: ['identificar', 'definir', 'reconhecer', 'listar', 'nomear', 'introdução', 'noção'] },
];

// ─── Service ────────────────────────────────────────────

export class CurriculumIntelligenceService {

  /**
   * Build a prerequisite graph from a dosificação.
   *
   * Prerequisites are inferred from:
   * 1. Sequential ordering within units (topic N depends on topic N-1)
   * 2. Cross-unit dependencies detected via content similarity
   * 3. Bloom's level progression (higher levels depend on lower)
   */
  buildGraph(content: DosificacaoContent): CurriculumGraph {
    const nodes: CurriculumNode[] = [];

    // Phase 1: Create nodes with metadata
    for (let u = 0; u < content.unidades.length; u++) {
      const unit = content.unidades[u];
      for (let t = 0; t < unit.topicos.length; t++) {
        const topic = unit.topicos[t];
        const id = this.buildNodeId(u, t);
        const bloom = this.inferBloomLevel(topic.objectivosEspecificos);
        const difficulty = this.inferDifficulty(topic.objectivosEspecificos, topic.conteudos, bloom);

        nodes.push({
          id,
          unitIndex: u,
          topicIndex: t,
          unitName: unit.nome,
          content: topic.conteudos,
          objectives: topic.objectivosEspecificos,
          numAulas: topic.numAulas,
          difficulty,
          bloomLevel: bloom,
          prerequisites: [],
          dependents: [],
        });
      }
    }

    // Phase 2: Infer prerequisites
    for (const node of nodes) {
      // Rule 1: Sequential within unit — topic N depends on topic N-1
      if (node.topicIndex > 0) {
        const prevId = this.buildNodeId(node.unitIndex, node.topicIndex - 1);
        if (!node.prerequisites.includes(prevId)) {
          node.prerequisites.push(prevId);
        }
      }

      // Rule 2: First topic of unit N depends on last topic of unit N-1
      if (node.topicIndex === 0 && node.unitIndex > 0) {
        const prevUnit = content.unidades[node.unitIndex - 1];
        if (prevUnit.topicos.length > 0) {
          const prevId = this.buildNodeId(node.unitIndex - 1, prevUnit.topicos.length - 1);
          if (!node.prerequisites.includes(prevId)) {
            node.prerequisites.push(prevId);
          }
        }
      }

      // Rule 3: Cross-unit content references (keyword matching)
      for (const other of nodes) {
        if (other.id === node.id) continue;
        if (node.prerequisites.includes(other.id)) continue;
        // Only look backwards (other must come before node in natural order)
        if (other.unitIndex > node.unitIndex) continue;
        if (other.unitIndex === node.unitIndex && other.topicIndex >= node.topicIndex) continue;

        if (this.hasContentDependency(node, other)) {
          node.prerequisites.push(other.id);
        }
      }
    }

    // Phase 3: Build dependents (reverse of prerequisites)
    for (const node of nodes) {
      for (const prereqId of node.prerequisites) {
        const prereqNode = nodes.find(n => n.id === prereqId);
        if (prereqNode && !prereqNode.dependents.includes(node.id)) {
          prereqNode.dependents.push(node.id);
        }
      }
    }

    // Phase 4: Topological sort
    const sortedOrder = this.topologicalSort(nodes);

    const totalLessons = nodes.reduce((sum, n) => sum + n.numAulas, 0);
    const averageDifficulty = nodes.length > 0
      ? Math.round((nodes.reduce((sum, n) => sum + n.difficulty, 0) / nodes.length) * 10) / 10
      : 0;

    return { nodes, sortedOrder, totalLessons, averageDifficulty };
  }

  /**
   * Validate a weekly plan against the curriculum graph.
   * Checks that prerequisites are taught before dependent topics.
   */
  validateSequence(
    weeklyPlan: { week: string; contents: string; numLessons: number }[],
    graph: CurriculumGraph,
  ): CurriculumValidationResult {
    const violations: SequenceViolation[] = [];
    const taughtNodes = new Set<string>();
    let coveredCount = 0;

    for (let w = 0; w < weeklyPlan.length; w++) {
      const week = weeklyPlan[w];
      const weekContent = normalizeText(week.contents);

      // Find which graph nodes this week covers
      const coveredThisWeek: CurriculumNode[] = [];
      for (const node of graph.nodes) {
        const nodeContent = normalizeText(node.content);
        if (weekContent.includes(nodeContent) || nodeContent.includes(weekContent)) {
          coveredThisWeek.push(node);
        }
      }

      // Check prerequisites
      for (const node of coveredThisWeek) {
        const missing = node.prerequisites
          .filter(prereqId => !taughtNodes.has(prereqId))
          .map(prereqId => graph.nodes.find(n => n.id === prereqId))
          .filter((n): n is CurriculumNode => !!n);

        if (missing.length > 0) {
          violations.push({
            topicId: node.id,
            topicContent: node.content,
            weekNumber: w + 1,
            missingPrerequisites: missing.map(m => ({ id: m.id, content: m.content })),
            severity: missing.some(m => m.unitIndex !== node.unitIndex) ? 'error' : 'warning',
            message: `Semana ${w + 1}: "${node.content.substring(0, 60)}" requer pré-requisito(s) ainda não leccionado(s): ${missing.map(m => m.content.substring(0, 40)).join('; ')}`,
          });
        }

        taughtNodes.add(node.id);
        coveredCount++;
      }
    }

    // Coverage
    const coveragePercent = graph.nodes.length > 0
      ? Math.round((coveredCount / graph.nodes.length) * 100)
      : 100;

    // Difficulty progression
    const difficultyProgression = this.analyzeDifficultyProgression(weeklyPlan, graph);

    // Score
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    const score = Math.max(0, Math.min(10, 10 - errorCount * 2 - warningCount * 0.5));

    return { violations, score, coveragePercent, difficultyProgression };
  }

  /**
   * Validate prerequisite ordering for an ordered list of topics (e.g., from Annual Plan trimesters[]).
   *
   * Unlike validateSequence() — which matches AI prose against graph node content —
   * this method uses word-overlap matching between topic titles and graph node content,
   * tolerating AI paraphrasing of dosificação conteudos.
   *
   * Only cross-unit violations are returned as 'error'. Intra-unit sequential
   * violations are omitted (noise for annual-level ordering).
   */
  validateTopicSequence(
    topics: { title: string }[],
    graph: CurriculumGraph,
  ): CurriculumValidationResult {
    const violations: SequenceViolation[] = [];
    const taughtNodes = new Set<string>();
    let coveredCount = 0;

    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const topicNorm = normalizeText(topic.title);

      // Find graph nodes whose content matches this topic title
      const coveredThisTopic: CurriculumNode[] = graph.nodes.filter(node =>
        this.topicMatchesNode(topicNorm, normalizeText(node.content)),
      );

      for (const node of coveredThisTopic) {
        // Only report cross-unit prerequisite violations (intra-unit ordering is implicit)
        const crossUnitMissing = node.prerequisites
          .filter(prereqId => !taughtNodes.has(prereqId))
          .map(prereqId => graph.nodes.find(n => n.id === prereqId))
          .filter((n): n is CurriculumNode => !!n && n.unitIndex !== node.unitIndex);

        if (crossUnitMissing.length > 0) {
          violations.push({
            topicId: node.id,
            topicContent: node.content,
            weekNumber: i + 1, // position in ordered topic list
            missingPrerequisites: crossUnitMissing.map(m => ({ id: m.id, content: m.content })),
            severity: 'error',
            message: `Tópico "${topic.title}" aparece antes do pré-requisito "${crossUnitMissing.map(m => m.content.substring(0, 50)).join('; ')}" no plano anual.`,
          });
        }

        taughtNodes.add(node.id);
        coveredCount++;
      }
    }

    const coveragePercent = graph.nodes.length > 0
      ? Math.round((coveredCount / graph.nodes.length) * 100)
      : 100;

    const errorCount = violations.length; // all are errors (cross-unit only)
    const score = Math.max(0, Math.min(10, 10 - errorCount * 2));

    return { violations, score, coveragePercent, difficultyProgression: 'ascending' };
  }

  /**
   * Match a topic title (normalized) against a graph node content (normalized).
   * Uses word-overlap heuristic to tolerate AI paraphrasing.
   * Requires ≥1 matching significant word AND ≥30% overlap ratio.
   */
  private topicMatchesNode(topicNorm: string, nodeContentNorm: string): boolean {
    const topicWords = topicNorm.split(/\s+/).filter(w => w.length >= 4);
    if (topicWords.length === 0) return false;

    const nodeWords = new Set(nodeContentNorm.split(/\s+/).filter(w => w.length >= 4));
    const matchCount = topicWords.filter(w => nodeWords.has(w)).length;

    return matchCount >= 1 && matchCount / topicWords.length >= 0.3;
  }

  /**
   * Generate an optimal topic ordering for a given number of weeks,
   * respecting prerequisites and balancing difficulty.
   */
  suggestOptimalSequence(
    graph: CurriculumGraph,
    availableWeeks: number,
    lessonsPerWeek: number,
  ): { weekNumber: number; nodeIds: string[]; estimatedDifficulty: number }[] {
    const sequence: { weekNumber: number; nodeIds: string[]; estimatedDifficulty: number }[] = [];
    let currentWeek = 1;
    let lessonsRemaining = lessonsPerWeek;

    for (const nodeId of graph.sortedOrder) {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node || currentWeek > availableWeeks) break;

      let lessonsNeeded = node.numAulas;

      while (lessonsNeeded > 0 && currentWeek <= availableWeeks) {
        // Find or create week entry
        let weekEntry = sequence.find(s => s.weekNumber === currentWeek);
        if (!weekEntry) {
          weekEntry = { weekNumber: currentWeek, nodeIds: [], estimatedDifficulty: 0 };
          sequence.push(weekEntry);
        }

        const lessonsToAssign = Math.min(lessonsNeeded, lessonsRemaining);
        weekEntry.nodeIds.push(nodeId);
        lessonsNeeded -= lessonsToAssign;
        lessonsRemaining -= lessonsToAssign;

        // Recalculate week difficulty as max of contained nodes
        const weekNodes = weekEntry.nodeIds.map(id => graph.nodes.find(n => n.id === id)).filter(Boolean);
        weekEntry.estimatedDifficulty = Math.max(...weekNodes.map(n => n!.difficulty));

        if (lessonsRemaining <= 0) {
          currentWeek++;
          lessonsRemaining = lessonsPerWeek;
        }
      }
    }

    return sequence;
  }

  // ─── Private helpers ──────────────────────────────────

  private buildNodeId(unitIndex: number, topicIndex: number): string {
    return `u${unitIndex}_t${topicIndex}`;
  }

  private inferBloomLevel(objectives: string): BloomLevel {
    const lower = normalizeText(objectives);
    for (const { level, markers } of BLOOM_MARKERS) {
      if (markers.some(m => lower.includes(m))) {
        return level;
      }
    }
    return BloomLevel.UNDERSTAND; // default
  }

  private inferDifficulty(objectives: string, content: string, bloom: BloomLevel): number {
    const combined = normalizeText(`${objectives} ${content}`);

    // Start with Bloom-based estimate
    let difficulty = Math.min(5, Math.ceil(bloom / 1.2));

    // Adjust with content markers
    for (const { level, markers } of DIFFICULTY_MARKERS) {
      if (markers.some(m => combined.includes(m))) {
        difficulty = Math.max(difficulty, level);
        break;
      }
    }

    return Math.min(5, Math.max(1, difficulty));
  }

  /**
   * Detect if nodeA's content references concepts from nodeB.
   * Uses keyword overlap heuristic.
   */
  private hasContentDependency(dependent: CurriculumNode, candidate: CurriculumNode): boolean {
    const depContent = normalizeText(dependent.content + ' ' + dependent.objectives);
    const candContent = normalizeText(candidate.content);

    // Extract significant terms (3+ chars) from candidate
    const candidateTerms = candContent.split(/\s+/).filter(t => t.length >= 4);
    if (candidateTerms.length === 0) return false;

    // Check if dependent references enough terms from candidate
    const matchCount = candidateTerms.filter(term => depContent.includes(term)).length;
    const matchRatio = matchCount / candidateTerms.length;

    return matchRatio >= 0.4; // 40% term overlap suggests dependency
  }

  private topologicalSort(nodes: CurriculumNode[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const visiting = new Set<string>(); // cycle detection

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) return; // cycle — skip
      visiting.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        for (const prereq of node.prerequisites) {
          visit(prereq);
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    for (const node of nodes) {
      visit(node.id);
    }

    return result;
  }

  private analyzeDifficultyProgression(
    weeklyPlan: { contents: string }[],
    graph: CurriculumGraph,
  ): 'ascending' | 'mixed' | 'descending' {
    const weekDifficulties: number[] = [];

    for (const week of weeklyPlan) {
      const weekContent = normalizeText(week.contents);
      let maxDifficulty = 1;

      for (const node of graph.nodes) {
        if (weekContent.includes(normalizeText(node.content))) {
          maxDifficulty = Math.max(maxDifficulty, node.difficulty);
        }
      }

      weekDifficulties.push(maxDifficulty);
    }

    if (weekDifficulties.length < 2) return 'ascending';

    let ascending = 0;
    let descending = 0;
    for (let i = 1; i < weekDifficulties.length; i++) {
      if (weekDifficulties[i] >= weekDifficulties[i - 1]) ascending++;
      else descending++;
    }

    if (ascending >= descending * 2) return 'ascending';
    if (descending >= ascending * 2) return 'descending';
    return 'mixed';
  }
}
