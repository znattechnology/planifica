export interface EmailVerificationToken {
  id: string;
  userId: string;
  code: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface IEmailVerificationTokenRepository {
  create(userId: string, code: string, expiresAt: Date): Promise<EmailVerificationToken>;
  findLatestByUserId(userId: string): Promise<EmailVerificationToken | null>;
  markAsUsed(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
