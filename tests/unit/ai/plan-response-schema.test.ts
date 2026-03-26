import { describe, it, expect } from 'vitest';
import {
  annualPlanResponseSchema,
  trimesterPlanResponseSchema,
  lessonPlanResponseSchema,
  reportResponseSchema,
} from '@/src/ai/schemas/plan-response.schema';

describe('AI Response Zod Schemas', () => {
  describe('annualPlanResponseSchema', () => {
    it('should parse a valid annual plan response', () => {
      const input = {
        generalObjectives: ['Obj 1'],
        specificObjectives: ['Spec 1'],
        competencies: ['Comp 1'],
        topics: [{ title: 'Tema 1' }],
        methodology: 'Expositivo',
        resources: ['Quadro'],
        assessment: 'Avaliação contínua',
      };
      const result = annualPlanResponseSchema.parse(input);
      expect(result.generalObjectives).toEqual(['Obj 1']);
      expect(result.topics[0].title).toBe('Tema 1');
    });

    it('should apply defaults for missing fields', () => {
      const result = annualPlanResponseSchema.parse({});
      expect(result.generalObjectives).toEqual([]);
      expect(result.specificObjectives).toEqual([]);
      expect(result.competencies).toEqual([]);
      expect(result.topics).toEqual([]);
    });

    it('should convert non-string methodology to JSON string', () => {
      const result = annualPlanResponseSchema.parse({
        methodology: { method: 'Expositivo', detail: 'Com exemplos' },
      });
      expect(typeof result.methodology).toBe('string');
      expect(result.methodology).toContain('Expositivo');
    });
  });

  describe('trimesterPlanResponseSchema', () => {
    it('should parse weeklyPlan with string objectives', () => {
      const result = trimesterPlanResponseSchema.parse({
        weeklyPlan: [
          { week: '1ª', objectives: 'Obj A', contents: 'Cont A' },
        ],
      });
      expect(result.weeklyPlan[0].objectives).toBe('Obj A');
      expect(result.weeklyPlan[0].numLessons).toBe(2); // default
    });

    it('should join array objectives into string', () => {
      const result = trimesterPlanResponseSchema.parse({
        weeklyPlan: [
          { week: '1ª', objectives: ['Obj A', 'Obj B'], contents: ['C1', 'C2'] },
        ],
      });
      expect(result.weeklyPlan[0].objectives).toBe('Obj A\nObj B');
      expect(result.weeklyPlan[0].contents).toBe('C1\nC2');
    });
  });

  describe('lessonPlanResponseSchema', () => {
    it('should parse a valid lesson plan', () => {
      const result = lessonPlanResponseSchema.parse({
        topic: 'Equações',
        duration: 90,
        lessonType: 'Teórica',
        lessonPhases: [
          { name: 'Início', duration: '5 min', activities: ['Saudar'] },
        ],
      });
      expect(result.topic).toBe('Equações');
      expect(result.duration).toBe(90);
      expect(result.lessonPhases[0].name).toBe('Início');
      expect(result.lessonPhases[0].methods).toBe(''); // default
    });

    it('should apply default values', () => {
      const result = lessonPlanResponseSchema.parse({});
      expect(result.topic).toBe('');
      expect(result.duration).toBe(45);
      expect(result.lessonType).toBe('Teórico-Prática');
      expect(result.homework).toBe('');
      expect(result.bibliography).toEqual([]);
    });
  });

  describe('reportResponseSchema', () => {
    it('should parse a valid report response', () => {
      const result = reportResponseSchema.parse({
        summary: 'Resumo do relatório',
        objectivesAchieved: [{ description: 'Obj 1', status: 'achieved' }],
        statistics: { totalLessonsDelivered: 40, totalHoursWorked: 30 },
      });
      expect(result.summary).toBe('Resumo do relatório');
      expect(result.objectivesAchieved[0].status).toBe('achieved');
      expect(result.statistics.totalLessonsDelivered).toBe(40);
      expect(result.statistics.totalTopicsCovered).toBe(0); // default
    });

    it('should apply defaults for empty input', () => {
      const result = reportResponseSchema.parse({});
      expect(result.summary).toBe('');
      expect(result.challenges).toEqual([]);
      expect(result.statistics.totalLessonsDelivered).toBe(0);
    });

    it('should reject invalid objective status', () => {
      expect(() =>
        reportResponseSchema.parse({
          objectivesAchieved: [{ description: 'Obj', status: 'invalid_status' }],
        }),
      ).toThrow();
    });
  });
});
