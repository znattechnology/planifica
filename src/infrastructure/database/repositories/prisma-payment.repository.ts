import { prisma } from '@/src/infrastructure/database/prisma/client';
import { Payment, PaymentSource, PaymentStatus } from '@/src/domain/entities/payment.entity';
import { IPaymentRepository } from '@/src/domain/interfaces/repositories/payment.repository';

function mapPayment(raw: {
  id: string;
  userId: string;
  subscriptionId: string;
  reference: string;
  amount: number;
  status: string;
  source: string;
  confirmationCode: string;
  failedAttempts: number;
  blockedUntil: Date | null;
  createdAt: Date;
  expiresAt: Date;
  confirmedAt: Date | null;
}): Payment {
  return {
    id: raw.id,
    userId: raw.userId,
    subscriptionId: raw.subscriptionId,
    reference: raw.reference,
    amount: raw.amount,
    status: raw.status as PaymentStatus,
    source: raw.source as PaymentSource,
    confirmationCode: raw.confirmationCode,
    failedAttempts: raw.failedAttempts,
    blockedUntil: raw.blockedUntil,
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
    confirmedAt: raw.confirmedAt,
  };
}

export class PrismaPaymentRepository implements IPaymentRepository {
  async findById(id: string): Promise<Payment | null> {
    const raw = await prisma.payment.findUnique({ where: { id } });
    return raw ? mapPayment(raw) : null;
  }

  async findByReference(reference: string): Promise<Payment | null> {
    const raw = await prisma.payment.findUnique({ where: { reference } });
    return raw ? mapPayment(raw) : null;
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    const rows = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapPayment);
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Payment[]> {
    const rows = await prisma.payment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapPayment);
  }

  async findPendingExpiredBefore(date: Date): Promise<Payment[]> {
    const rows = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        expiresAt: { lt: date },
      },
    });
    return rows.map(mapPayment);
  }

  async create(data: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const raw = await prisma.payment.create({ data });
    return mapPayment(raw);
  }

  async update(
    id: string,
    data: Partial<Pick<Payment, 'status' | 'confirmedAt' | 'failedAttempts' | 'blockedUntil'>>,
  ): Promise<Payment> {
    const raw = await prisma.payment.update({ where: { id }, data });
    return mapPayment(raw);
  }

  async findAll(pagination?: { page?: number; limit?: number }): Promise<{
    data: Payment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.payment.count(),
    ]);

    const data = rows.map(row => ({
      ...mapPayment(row),
      userName: row.user.name,
      userEmail: row.user.email,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
