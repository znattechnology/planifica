import { Plan } from '@/src/domain/entities/plan.entity';
import { PlanResponseDTO } from '@/src/application/dtos/plan';

export interface PlanMappingOptions {
  calendarVersionMap?: Map<string, number>; // calendarId → current version
}

export class PlanMapper {
  static toDTO(plan: Plan, options?: PlanMappingOptions): PlanResponseDTO {
    let isCalendarOutdated: boolean | undefined;
    if (plan.calendarId && plan.calendarVersion != null && options?.calendarVersionMap) {
      const currentVersion = options.calendarVersionMap.get(plan.calendarId);
      if (currentVersion != null) {
        isCalendarOutdated = plan.calendarVersion !== currentVersion;
      }
    }

    return {
      id: plan.id,
      type: plan.type,
      title: plan.title,
      subject: plan.subject,
      grade: plan.grade,
      academicYear: plan.academicYear,
      content: plan.content,
      status: plan.status,
      parentPlanId: plan.parentPlanId,
      dosificacaoId: plan.dosificacaoId,
      calendarId: plan.calendarId,
      calendarVersion: plan.calendarVersion,
      qualityScores: plan.qualityScores,
      isCalendarOutdated,
      calendarSource: plan.calendarSource,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  static toDTOList(plans: Plan[], options?: PlanMappingOptions): PlanResponseDTO[] {
    return plans.map(p => PlanMapper.toDTO(p, options));
  }
}
