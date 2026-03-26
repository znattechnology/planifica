import { prisma } from '@/src/infrastructure/database/prisma/client';
import {
  IPasswordResetTokenRepository,
  PasswordResetToken,
} from '@/src/domain/interfaces/repositories/password-reset-token.repository';

export class PrismaPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async create(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const record = await prisma.passwordResetToken.create({
      data: { userId, token, expiresAt },
    });
    return record as PasswordResetToken;
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });
    return record as PasswordResetToken | null;
  }

  async markAsUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpiredByUser(userId: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
  }
}
