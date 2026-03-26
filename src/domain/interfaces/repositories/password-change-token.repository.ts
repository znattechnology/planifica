export interface PasswordChangeToken {
  id: string;
  userId: string;
  code: string;
  newPasswordHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface IPasswordChangeTokenRepository {
  create(userId: string, code: string, newPasswordHash: string, expiresAt: Date): Promise<PasswordChangeToken>;
  findLatestByUserId(userId: string): Promise<PasswordChangeToken | null>;
  markAsUsed(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
