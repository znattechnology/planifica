const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (IS_PRODUCTION && !secret) {
    throw new Error('FATAL: NEXTAUTH_SECRET must be set in production. Cannot start.');
  }
  return secret || 'dev-secret-unsafe-do-not-use-in-production';
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION,
  DATABASE_URL: getEnvVar('DATABASE_URL', IS_PRODUCTION ? undefined : 'postgresql://localhost:5432/planifica'),
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Planifica <onboarding@resend.dev>',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  NEXTAUTH_SECRET: getSecret(),
  NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL', IS_PRODUCTION ? undefined : 'http://localhost:3000'),
  AI_MODEL: process.env.AI_MODEL || 'gpt-4o',
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
  // Upstash Redis — optional; if absent, in-memory rate limiting is used as fallback
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
} as const;
