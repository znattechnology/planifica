import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { SubscriptionPlanConfig } from '@/src/domain/entities/subscription-plan-config.entity';
import { ValidationError, EntityNotFoundError } from '@/src/domain/errors/domain.error';

export interface UpdateSubscriptionPlanConfigInput {
  name?: string;
  priceKz?: number;
  durationDays?: number;
  plansPerMonth?: number;
  paymentExpiryHours?: number;
  isActive?: boolean;
}

export class UpdateSubscriptionPlanConfigUseCase {
  constructor(private readonly repository: ISubscriptionPlanConfigRepository) {}

  async execute(id: string, input: UpdateSubscriptionPlanConfigInput): Promise<SubscriptionPlanConfig> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new EntityNotFoundError('SubscriptionPlanConfig', id);

    if (input.priceKz !== undefined && input.priceKz < 0) {
      throw new ValidationError('O preço não pode ser negativo');
    }
    if (input.durationDays !== undefined && input.durationDays <= 0) {
      throw new ValidationError('A duração deve ser superior a 0 dias');
    }
    if (input.plansPerMonth !== undefined && input.plansPerMonth < -1) {
      throw new ValidationError('O limite de planos deve ser -1 (ilimitado) ou superior');
    }
    if (input.paymentExpiryHours !== undefined && input.paymentExpiryHours < 0) {
      throw new ValidationError('A expiração do pagamento não pode ser negativa');
    }

    const data: Partial<Omit<SubscriptionPlanConfig, 'id' | 'createdAt' | 'updatedAt'>> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.priceKz !== undefined) data.priceKz = input.priceKz;
    if (input.durationDays !== undefined) data.durationDays = input.durationDays;
    if (input.plansPerMonth !== undefined) data.plansPerMonth = input.plansPerMonth;
    if (input.paymentExpiryHours !== undefined) data.paymentExpiryHours = input.paymentExpiryHours;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return this.repository.update(id, data);
  }
}
