import { describe, it, expect } from 'vitest';
import { PlanPromptBuilder } from '@/src/ai/prompts/plan-prompt-builder';
import { PlanType } from '@/src/domain/entities/plan.entity';
import type { Dosificacao } from '@/src/domain/entities/dosificacao.entity';

const mockDosificacao: Dosificacao = {
  id: 'dos-1',
  userId: 'user-1',
  title: 'Matemática 10ª',
  subject: 'Matemática',
  grade: '10ª Classe',
  academicYear: '2025/2026',
  trimester: 1,
  content: {
    themes: [
      {
        unit: '1',
        title: 'Álgebra',
        objectives: ['Resolver equações lineares'],
        weeks: 4,
        contents: ['Equações do 1º grau'],
      },
    ],
    totalWeeks: 12,
    hoursPerWeek: 4,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PlanPromptBuilder', () => {
  it('should build messages with system and user roles', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.ANNUAL,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('should include subject and grade in user prompt', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.ANNUAL,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
    });

    expect(messages[1].content).toContain('Subject: Matemática');
    // NFKC normalization in sanitizePromptInput converts ª → a
    expect(messages[1].content).toContain('Grade: 10a Classe');
  });

  it('should include dosificacao content in user prompt', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.ANNUAL,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
    });

    expect(messages[1].content).toContain('Dosificação');
    expect(messages[1].content).toContain('Álgebra');
    expect(messages[1].content).toContain('Resolver equações lineares');
  });

  it('should include trimester when provided', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.TRIMESTER,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
      trimester: 2,
    });

    expect(messages[1].content).toContain('Trimester: 2');
  });

  it('should include week when provided', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.BIWEEKLY,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
      week: 5,
    });

    expect(messages[1].content).toContain('Week: 5');
  });

  it('should include parent plan content when provided', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.LESSON,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
      parentPlanContent: '{"objectives": ["Objectivo do plano pai"]}',
    });

    expect(messages[1].content).toContain('Parent Plan Content');
    expect(messages[1].content).toContain('Objectivo do plano pai');
  });

  it('should include additional context when provided', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.ANNUAL,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
      additionalContext: 'Turma com 40 alunos',
    });

    expect(messages[1].content).toContain('Additional Instructions: Turma com 40 alunos');
  });

  it('should not include trimester/week when not provided', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.ANNUAL,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
    });

    expect(messages[1].content).not.toContain('Trimester:');
    expect(messages[1].content).not.toContain('Week:');
  });

  it('should include academic year from dosificacao', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.ANNUAL,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
    });

    expect(messages[1].content).toContain('Academic Year: 2025/2026');
  });

  it('should request JSON format output', () => {
    const messages = PlanPromptBuilder.build({
      type: PlanType.ANNUAL,
      dosificacao: mockDosificacao,
      subject: 'Matemática',
      grade: '10ª Classe',
    });

    expect(messages[1].content).toContain('JSON format');
    expect(messages[1].content).toContain('objectives');
    expect(messages[1].content).toContain('competencies');
    expect(messages[1].content).toContain('topics');
  });
});
