import { PlanType } from '@/src/domain/entities/plan.entity';
import { IPlanGenerationStrategy } from './plan-generation.strategy';
import { AnnualPlanStrategy } from './annual-plan.strategy';
import { TrimesterPlanStrategy } from './trimester-plan.strategy';
import { BiweeklyPlanStrategy } from './biweekly-plan.strategy';
import { LessonPlanStrategy } from './lesson-plan.strategy';

export { type IPlanGenerationStrategy, type PlanGenerationContext } from './plan-generation.strategy';

const strategies: Record<PlanType, IPlanGenerationStrategy> = {
  [PlanType.ANNUAL]: new AnnualPlanStrategy(),
  [PlanType.TRIMESTER]: new TrimesterPlanStrategy(),
  [PlanType.BIWEEKLY]: new BiweeklyPlanStrategy(),
  [PlanType.LESSON]: new LessonPlanStrategy(),
};

export function getStrategy(type: PlanType): IPlanGenerationStrategy {
  const strategy = strategies[type];
  if (!strategy) {
    throw new Error(`No generation strategy found for plan type: ${type}`);
  }
  return strategy;
}
