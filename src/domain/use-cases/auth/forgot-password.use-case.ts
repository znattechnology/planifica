import { randomBytes } from 'crypto';
import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IPasswordResetTokenRepository } from '@/src/domain/interfaces/repositories/password-reset-token.repository';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';

const TOKEN_EXPIRY_HOURS = 1;

export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly emailService: IEmailService,
    private readonly baseUrl: string,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) return;

    // Clean up old tokens
    await this.tokenRepository.deleteExpiredByUser(user.id);

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.tokenRepository.create(user.id, token, expiresAt);

    const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;
    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);
  }
}
