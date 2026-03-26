import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IEmailVerificationTokenRepository } from '@/src/domain/interfaces/repositories/email-verification-token.repository';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';
import { ValidationError, UnauthorizedError } from '@/src/domain/errors/domain.error';
import { randomInt } from 'crypto';

export class ResendVerificationCodeUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IEmailVerificationTokenRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    if (user.emailVerified) {
      throw new ValidationError('Email já verificado');
    }

    // Rate limit: check if last code was sent less than 60 seconds ago
    const lastToken = await this.tokenRepository.findLatestByUserId(userId);
    if (lastToken) {
      const secondsSinceLastCode = (Date.now() - lastToken.createdAt.getTime()) / 1000;
      if (secondsSinceLastCode < 60) {
        throw new ValidationError('Aguarde 60 segundos antes de solicitar um novo código');
      }
    }

    // Delete old tokens
    await this.tokenRepository.deleteByUserId(userId);

    // Generate new 6-digit code
    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.tokenRepository.create(userId, code, expiresAt);
    await this.emailService.sendVerificationCodeEmail(user.email, code, user.name);
  }
}
