import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IPasswordResetTokenRepository } from '@/src/domain/interfaces/repositories/password-reset-token.repository';
import { IHashService } from '@/src/domain/interfaces/services/hash.service';
import { ValidationError } from '@/src/domain/errors/domain.error';

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IPasswordResetTokenRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.tokenRepository.findByToken(token);

    if (!resetToken) {
      throw new ValidationError('Link de recuperação inválido ou expirado');
    }

    if (resetToken.usedAt) {
      throw new ValidationError('Este link já foi utilizado');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new ValidationError('Este link expirou. Solicite um novo');
    }

    const hashedPassword = await this.hashService.hash(newPassword);

    await this.userRepository.update(resetToken.userId, { password: hashedPassword });
    await this.tokenRepository.markAsUsed(resetToken.id);
  }
}
