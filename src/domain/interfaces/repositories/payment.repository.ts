import { Payment, PaymentStatus } from '@/src/domain/entities/payment.entity';

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>;
  findByReference(reference: string): Promise<Payment | null>;
  findByUserId(userId: string): Promise<Payment[]>;
  findBySubscriptionId(subscriptionId: string): Promise<Payment[]>;
  findPendingExpiredBefore(date: Date): Promise<Payment[]>;
  create(data: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment>;
  update(id: string, data: Partial<Pick<Payment, 'status' | 'confirmedAt' | 'failedAttempts' | 'blockedUntil'>>): Promise<Payment>;
  findAll(pagination?: { page?: number; limit?: number }): Promise<{
    data: (Payment & { userName?: string; userEmail?: string })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}
