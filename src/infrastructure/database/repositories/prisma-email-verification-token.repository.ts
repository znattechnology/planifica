import { prisma } from '@/src/infrastructure/database/prisma/client';
import {
  IEmailVerificationTokenRepository,
  EmailVerificationToken,
} from '@/src/domain/interfaces/repositories/email-verification-token.repository';

export class PrismaEmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  async create(userId: string, code: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const record = await prisma.emailVerificationToken.create({
      data: { userId, code, expiresAt },
    });
    return record as EmailVerificationToken;
  }

  async findLatestByUserId(userId: string): Promise<EmailVerificationToken | null> {
    const record = await prisma.emailVerificationToken.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return record as EmailVerificationToken | null;
  }

  async markAsUsed(id: string): Promise<void> {
    await prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
  }
}
