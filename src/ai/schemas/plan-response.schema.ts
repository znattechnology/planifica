import { z } from 'zod';

// Coerce any value to string (AI sometimes returns numbers for text fields)
const coerceString = z.union([z.string(), z.number(), z.null(), z.undefined()])
  .transform(v => (v == null ? '' : String(v)));

// Coerce any value to number (AI sometimes returns strings for numeric fields)
const coerceNumber = z.union([z.string(), z.number(), z.null(), z.undefined()])
  .transform(v => {
    if (v == null || v === '') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  });

// Coerce a value that should be string[] (AI sometimes returns a plain string)
const coerceStringArray = z.union([
  z.array(z.union([z.string(), z.number()]).transform(String)),
  z.string().transform(v => v.split('\n').map(s => s.trim()).filter(Boolean)),
  z.null(),
  z.undefined(),
]).transform(v => v ?? []);

// Shared sub-schemas
const topicItemSchema = z.object({
  title: z.string().catch(''),
  subtopics: z.union([
    z.array(z.union([z.string(), z.number()]).transform(String)),
    z.string().transform(v => v.split('\n').map(s => s.trim()).filter(Boolean)),
  ]).optional().catch(undefined),
  duration: coerceString.optional().catch(undefined),
  week: coerceNumber.optional().catch(undefined),
}).catch({ title: '', subtopics: undefined, duration: undefined, week: undefined });

const weeklyPlanItemSchema = z.object({
  week: z.union([z.string(), z.number()]).transform(String).catch(''),
  period: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(v => v == null ? '' : String(v)).default(''),
  unit: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(v => v == null ? 'I' : String(v)).default('I'),
  objectives: z.union([z.string(), z.array(z.unknown())]).transform(v =>
    Array.isArray(v) ? v.map(String).join('\n') : String(v ?? ''),
  ).catch(''),
  contents: z.union([z.string(), z.array(z.unknown())]).transform(v =>
    Array.isArray(v) ? v.map(String).join('\n') : String(v ?? ''),
  ).catch(''),
  numLessons: coerceNumber.default(2).catch(2),
}).catch({ week: '', period: '', unit: 'I', objectives: '', contents: '', numLessons: 2 });

const lessonPhaseSchema = z.object({
  name: coerceString.default(''),
  duration: coerceString.default(''),
  content: coerceString.default(''),
  activities: coerceStringArray.default([]),
  methods: coerceString.default(''),
  resources: coerceString.default(''),
  assessment: coerceString.default(''),
}).catch({ name: '', duration: '', content: '', activities: [], methods: '', resources: '', assessment: '' });

const stringOrJsonString = z.union([
  z.string(),
  z.unknown().transform(v => JSON.stringify(v, null, 2)),
]);

// Base plan fields shared across annual, biweekly, and trimester
const basePlanSchema = z.object({
  generalObjectives: coerceStringArray.default([]),
  objectives: coerceStringArray.optional(), // legacy fallback
  specificObjectives: coerceStringArray.default([]),
  competencies: coerceStringArray.default([]),
  topics: z.union([
    z.array(topicItemSchema),
    z.string().transform(() => []),
    z.null(),
  ]).default([]).catch([]),
  methodology: stringOrJsonString.optional(),
  resources: coerceStringArray.optional(),
  assessment: stringOrJsonString.optional(),
});

// Trimester section inside Annual Plan
const annualTrimesterSectionSchema = z.object({
  number: z.union([z.literal(1), z.literal(2), z.literal(3), z.number()])
    .transform(v => Math.max(1, Math.min(3, Number(v))) as 1 | 2 | 3)
    .catch(1 as const),
  startDate: z.string().optional().catch(undefined),
  endDate: z.string().optional().catch(undefined),
  estimatedWeeks: coerceNumber.default(12),
  topics: z.union([
    z.array(topicItemSchema),
    z.string().transform(() => []),
    z.null(),
  ]).default([]).catch([]),
  generalObjectives: coerceStringArray.default([]),
  specificObjectives: coerceStringArray.default([]),
}).catch({
  number: 1 as const,
  startDate: undefined,
  endDate: undefined,
  estimatedWeeks: 12,
  topics: [],
  generalObjectives: [],
  specificObjectives: [],
});

// Annual plan schema — extends base with trimester-partitioned structure
export const annualPlanResponseSchema = basePlanSchema.extend({
  trimesters: z.union([
    z.array(annualTrimesterSectionSchema),
    z.null(),
    z.undefined(),
  ]).optional().catch(undefined),
});

// Biweekly plan schema (same shape as original base)
export const biweeklyPlanResponseSchema = basePlanSchema;

// Trimester plan schema (adds weeklyPlan)
export const trimesterPlanResponseSchema = basePlanSchema.extend({
  weeklyPlan: z.array(weeklyPlanItemSchema).default([]),
  totalWeeks: z.number().optional(),
  totalLessons: z.number().optional(),
});

// Lesson plan schema
export const lessonPlanResponseSchema = basePlanSchema.extend({
  topic: z.string().default(''),
  duration: z.number().default(45),
  lessonType: z.string().default('Teórico-Prática'),
  didacticUnit: z.string().optional(),
  summary: z.string().optional(),
  lessonPhases: z.array(lessonPhaseSchema).default([]),
  homework: z.string().default(''),
  bibliography: z.array(z.string()).default([]),
});

// Report response schema
const reportObjectiveSchema = z.object({
  description: z.string(),
  status: z.enum(['achieved', 'partial', 'not_achieved']).default('partial'),
  evidence: z.string().optional(),
});

const reportTopicSchema = z.object({
  title: z.string(),
  hoursSpent: z.number().default(0),
  completionPercentage: z.number().default(0),
  observations: z.string().optional(),
});

const reportStatisticsSchema = z.object({
  totalLessonsDelivered: z.number().default(0),
  totalHoursWorked: z.number().default(0),
  totalTopicsCovered: z.number().default(0),
  plannedVsDelivered: z.number().default(0),
  averageStudentCount: z.number().optional(),
});

export const reportResponseSchema = z.object({
  summary: z.string().default(''),
  objectivesAchieved: z.array(reportObjectiveSchema).default([]),
  topicsCovered: z.array(reportTopicSchema).default([]),
  studentPerformance: z.string().default(''),
  methodology: z.string().default(''),
  challenges: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  statistics: reportStatisticsSchema.default({
    totalLessonsDelivered: 0,
    totalHoursWorked: 0,
    totalTopicsCovered: 0,
    plannedVsDelivered: 0,
  }),
});
