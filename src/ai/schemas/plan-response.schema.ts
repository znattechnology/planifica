import { z } from 'zod';

// Shared sub-schemas
const topicItemSchema = z.object({
  title: z.string(),
  subtopics: z.array(z.string()).optional(),
  duration: z.string().optional(),
  week: z.number().optional(),
});

const weeklyPlanItemSchema = z.object({
  week: z.string(),
  period: z.string().optional().default(''),
  unit: z.string().default('I'),
  objectives: z.union([z.string(), z.array(z.string())]).transform(v =>
    Array.isArray(v) ? v.join('\n') : v,
  ),
  contents: z.union([z.string(), z.array(z.string())]).transform(v =>
    Array.isArray(v) ? v.join('\n') : v,
  ),
  numLessons: z.number().default(2),
});

const lessonPhaseSchema = z.object({
  name: z.string().default(''),
  duration: z.string().default(''),
  content: z.string().default(''),
  activities: z.array(z.string()).default([]),
  methods: z.string().default(''),
  resources: z.string().default(''),
  assessment: z.string().default(''),
});

const stringOrJsonString = z.union([
  z.string(),
  z.unknown().transform(v => JSON.stringify(v, null, 2)),
]);

// Base plan fields shared across annual, biweekly, and trimester
const basePlanSchema = z.object({
  generalObjectives: z.array(z.string()).default([]),
  objectives: z.array(z.string()).optional(), // legacy fallback
  specificObjectives: z.array(z.string()).default([]),
  competencies: z.array(z.string()).default([]),
  topics: z.array(topicItemSchema).default([]),
  methodology: stringOrJsonString.optional(),
  resources: z.array(z.string()).optional(),
  assessment: stringOrJsonString.optional(),
});

// Annual / Biweekly plan schema (same shape)
export const annualPlanResponseSchema = basePlanSchema;
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
