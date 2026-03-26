import { prisma } from '@/src/infrastructure/database/prisma/client';
import {
  IPasswordChangeTokenRepository,
  PasswordChangeToken,
} from '@/src/domain/interfaces/repositories/password-change-token.repository';

export class PrismaPasswordChangeTokenRepository implements IPasswordChangeTokenRepository {
  async create(userId: string, code: string, newPasswordHash: string, expiresAt: Date): Promise<PasswordChangeToken> {
    const record = await prisma.passwordChangeToken.create({
      data: { userId, code, newPasswordHash, expiresAt },
    });
    return record as PasswordChangeToken;
  }

  async findLatestByUserId(userId: string): Promise<PasswordChangeToken | null> {
    const record = await prisma.passwordChangeToken.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return record as PasswordChangeToken | null;
  }

  async markAsUsed(id: string): Promise<void> {
    await prisma.passwordChangeToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.passwordChangeToken.deleteMany({
      where: { userId },
    });
  }
}
