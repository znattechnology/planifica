export const APP_NAME = 'Planifica';
export const APP_DESCRIPTION = 'AI-powered lesson planning system';

export const GRADES = [
  '1st Grade', '2nd Grade', '3rd Grade', '4th Grade',
  '5th Grade', '6th Grade', '7th Grade', '8th Grade',
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
] as const;

export const TRIMESTERS = [1, 2, 3] as const;

export const PLAN_TYPE_LABELS = {
  ANNUAL: 'Plano Anual',
  TRIMESTER: 'Plano Trimestral',
  BIWEEKLY: 'Plano Quinzenal',
  LESSON: 'Plano de Aula',
} as const;

export const PLAN_STATUS_LABELS = {
  DRAFT: 'Rascunho',
  GENERATING: 'Gerando...',
  GENERATED: 'Gerado',
  REVIEWED: 'Revisado',
  APPROVED: 'Aprovado',
} as const;
