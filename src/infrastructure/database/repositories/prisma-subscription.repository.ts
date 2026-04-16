import { prisma } from '@/src/infrastructure/database/prisma/client';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '@/src/domain/entities/subscription.entity';
import { ISubscriptionRepository } from '@/src/domain/interfaces/repositories/subscription.repository';

function mapSubscription(raw: {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}): Subscription {
  return {
    id: raw.id,
    userId: raw.userId,
    plan: raw.plan as SubscriptionPlan,
    status: raw.status as SubscriptionStatus,
    startDate: raw.startDate,
    endDate: raw.endDate,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  async findById(id: string): Promise<Subscription | null> {
    const raw = await prisma.subscription.findUnique({ where: { id } });
    return raw ? mapSubscription(raw) : null;
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    const raw = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return raw ? mapSubscription(raw) : null;
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    const rows = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapSubscription);
  }

  async findAllActive(): Promise<Subscription[]> {
    const rows = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
    });
    return rows.map(mapSubscription);
  }

  async findExpiredBefore(date: Date): Promise<Subscription[]> {
    // Only PREMIUM subscriptions expire — FREE plans use a far-future sentinel
    // date and must never be touched by the cron job.
    const rows = await prisma.subscription.findMany({
      where: {
        plan: 'PREMIUM',
        endDate: { lt: date },
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
      },
    });
    return rows.map(mapSubscription);
  }

  async create(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    const raw = await prisma.subscription.create({ data });
    return mapSubscription(raw);
  }

  async update(
    id: string,
    data: Partial<Pick<Subscription, 'plan' | 'status' | 'startDate' | 'endDate'>>,
  ): Promise<Subscription> {
    const raw = await prisma.subscription.update({ where: { id }, data });
    return mapSubscription(raw);
  }

  async findAll(pagination?: { page?: number; limit?: number }): Promise<{
    data: Subscription[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.subscription.count(),
    ]);

    const data = rows.map(row => ({
      ...mapSubscription(row),
      userName: row.user.name,
      userEmail: row.user.email,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
