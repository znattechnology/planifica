import { prisma } from '@/src/infrastructure/database/prisma/client';
import { SubscriptionPlanConfig } from '@/src/domain/entities/subscription-plan-config.entity';
import { ISubscriptionPlanConfigRepository } from '@/src/domain/interfaces/repositories/subscription-plan-config.repository';

function mapConfig(raw: {
  id: string;
  slug: string;
  name: string;
  priceKz: number;
  durationDays: number;
  plansPerMonth: number;
  paymentExpiryHours: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SubscriptionPlanConfig {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    priceKz: raw.priceKz,
    durationDays: raw.durationDays,
    plansPerMonth: raw.plansPerMonth,
    paymentExpiryHours: raw.paymentExpiryHours,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export class PrismaSubscriptionPlanConfigRepository implements ISubscriptionPlanConfigRepository {
  async findAll(): Promise<SubscriptionPlanConfig[]> {
    const rows = await prisma.subscriptionPlanConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapConfig);
  }

  async findBySlug(slug: string): Promise<SubscriptionPlanConfig | null> {
    const row = await prisma.subscriptionPlanConfig.findUnique({ where: { slug } });
    return row ? mapConfig(row) : null;
  }

  async findById(id: string): Promise<SubscriptionPlanConfig | null> {
    const row = await prisma.subscriptionPlanConfig.findUnique({ where: { id } });
    return row ? mapConfig(row) : null;
  }

  async create(
    data: Omit<SubscriptionPlanConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SubscriptionPlanConfig> {
    const row = await prisma.subscriptionPlanConfig.create({ data });
    return mapConfig(row);
  }

  async update(
    id: string,
    data: Partial<Omit<SubscriptionPlanConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<SubscriptionPlanConfig> {
    const row = await prisma.subscriptionPlanConfig.update({ where: { id }, data });
    return mapConfig(row);
  }
}
