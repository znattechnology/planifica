/**
 * Output format templates for structured AI responses.
 * These templates define the expected JSON structure for each plan type.
 */
export const PLAN_OUTPUT_SCHEMAS = {
  ANNUAL: {
    objectives: ['string'],
    competencies: ['string'],
    topics: [
      {
        title: 'string',
        subtopics: ['string'],
        duration: 'string (e.g., "4 weeks")',
        week: 'number (starting week)',
      },
    ],
    methodology: 'string',
    resources: ['string'],
    assessment: 'string',
  },

  LESSON: {
    objective: 'string',
    competencies: ['string'],
    introduction: {
      description: 'string',
      duration: 'number (minutes)',
      activities: ['string'],
      teacherActions: ['string'],
      studentActions: ['string'],
    },
    development: {
      description: 'string',
      duration: 'number (minutes)',
      activities: ['string'],
      teacherActions: ['string'],
      studentActions: ['string'],
    },
    conclusion: {
      description: 'string',
      duration: 'number (minutes)',
      activities: ['string'],
      teacherActions: ['string'],
      studentActions: ['string'],
    },
    resources: ['string'],
    assessment: 'string',
    homework: 'string (optional)',
  },
} as const;
