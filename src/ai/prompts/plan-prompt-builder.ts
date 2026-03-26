import { PlanType } from '@/src/domain/entities/plan.entity';
import { Dosificacao } from '@/src/domain/entities/dosificacao.entity';
import { SYSTEM_PROMPTS } from './system-prompts';
import { AIMessage } from '@/src/ai/types/ai.types';

interface PromptContext {
  type: PlanType;
  dosificacao: Dosificacao;
  subject: string;
  grade: string;
  trimester?: number;
  week?: number;
  parentPlanContent?: string;
  additionalContext?: string;
}

export class PlanPromptBuilder {
  static build(context: PromptContext): AIMessage[] {
    const systemPrompt = this.getSystemPrompt(context.type);
    const userPrompt = this.buildUserPrompt(context);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private static getSystemPrompt(type: PlanType): string {
    const typePrompts: Record<PlanType, string> = {
      [PlanType.ANNUAL]: SYSTEM_PROMPTS.ANNUAL_PLAN,
      [PlanType.TRIMESTER]: SYSTEM_PROMPTS.TRIMESTER_PLAN,
      [PlanType.BIWEEKLY]: SYSTEM_PROMPTS.BIWEEKLY_PLAN,
      [PlanType.LESSON]: SYSTEM_PROMPTS.LESSON_PLAN,
    };

    return `${SYSTEM_PROMPTS.PLAN_GENERATOR}\n\n${typePrompts[type]}`;
  }

  private static buildUserPrompt(context: PromptContext): string {
    const parts: string[] = [
      `Subject: ${context.subject}`,
      `Grade: ${context.grade}`,
      `Academic Year: ${context.dosificacao.academicYear}`,
    ];

    if (context.trimester) {
      parts.push(`Trimester: ${context.trimester}`);
    }

    if (context.week) {
      parts.push(`Week: ${context.week}`);
    }

    parts.push(`\nDosificação (Annual Content Plan):`);
    parts.push(JSON.stringify(context.dosificacao.content, null, 2));

    if (context.parentPlanContent) {
      parts.push(`\nParent Plan Content (use as reference):`);
      parts.push(context.parentPlanContent);
    }

    if (context.additionalContext) {
      parts.push(`\nAdditional Instructions: ${context.additionalContext}`);
    }

    parts.push(`\nGenerate the plan in structured JSON format with the following fields:`);
    parts.push(`- objectives: string[]`);
    parts.push(`- competencies: string[]`);
    parts.push(`- topics: { title: string, subtopics?: string[], duration?: string, week?: number }[]`);
    parts.push(`- methodology: string`);
    parts.push(`- resources: string[]`);
    parts.push(`- assessment: string`);

    return parts.join('\n');
  }
}
