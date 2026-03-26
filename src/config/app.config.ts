export const appConfig = {
  name: 'Planifica',
  description: 'AI-powered lesson planning system',
  version: '0.1.0',
  defaultLocale: 'pt-AO',
  pagination: {
    defaultPerPage: 10,
    maxPerPage: 100,
  },
  ai: {
    defaultModel: 'gpt-4o',
    defaultTemperature: 0.7,
    maxRetries: 3,
    retryDelay: 1000,
  },
  plans: {
    maxAnnualPlansPerUser: 10,
    maxTrimesterPlansPerAnnual: 3,
  },
} as const;
