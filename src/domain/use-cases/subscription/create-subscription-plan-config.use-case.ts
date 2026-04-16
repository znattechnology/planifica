import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';
import { SubscriptionPlanConfig } from '@/src/domain/entities/subscription-plan-config.entity';
import { ValidationError } from '@/src/domain/errors/domain.error';

export interface CreateSubscriptionPlanConfigInput {
  slug: string;
  name: string;
  priceKz: number;
  durationDays: number;
  plansPerMonth: number;
  paymentExpiryHours: number;
  isActive?: boolean;
}

export class CreateSubscriptionPlanConfigUseCase {
  constructor(private readonly repository: ISubscriptionPlanConfigRepository) {}

  async execute(input: CreateSubscriptionPlanConfigInput): Promise<SubscriptionPlanConfig> {
    const slug = input.slug.trim().toUpperCase();
    if (!slug) throw new ValidationError('O slug do plano é obrigatório');

    const existing = await this.repository.findBySlug(slug);
    if (existing) throw new ValidationError(`Já existe um plano com o slug "${slug}"`);

    if (input.priceKz < 0) throw new ValidationError('O preço não pode ser negativo');
    if (input.durationDays <= 0) throw new ValidationError('A duração deve ser superior a 0 dias');
    if (input.plansPerMonth < -1) throw new ValidationError('O limite de planos deve ser -1 (ilimitado) ou superior');
    if (input.paymentExpiryHours < 0) throw new ValidationError('A expiração do pagamento não pode ser negativa');

    return this.repository.create({
      slug,
      name: input.name.trim(),
      priceKz: input.priceKz,
      durationDays: input.durationDays,
      plansPerMonth: input.plansPerMonth,
      paymentExpiryHours: input.paymentExpiryHours,
      isActive: input.isActive ?? true,
    });
  }
}
