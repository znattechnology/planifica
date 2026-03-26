import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IHashService } from '@/src/domain/interfaces/services/hash.service';
import { IPasswordChangeTokenRepository } from '@/src/domain/interfaces/repositories/password-change-token.repository';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';
import { UnauthorizedError, ValidationError } from '@/src/domain/errors/domain.error';
import { randomInt } from 'crypto';

export class RequestPasswordChangeUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly tokenRepository: IPasswordChangeTokenRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    // Validate current password
    const passwordMatch = await this.hashService.compare(
      currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new ValidationError('Palavra-passe actual incorrecta');
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

    // Hash new password and store it in the token
    const newPasswordHash = await this.hashService.hash(newPassword);

    // Generate 6-digit code
    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.tokenRepository.create(userId, code, newPasswordHash, expiresAt);
    await this.emailService.sendPasswordChangeCodeEmail(user.email, code, user.name);
  }
}
