import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IPasswordChangeTokenRepository } from '@/src/domain/interfaces/repositories/password-change-token.repository';
import { UnauthorizedError, ValidationError } from '@/src/domain/errors/domain.error';

export class ConfirmPasswordChangeUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IPasswordChangeTokenRepository,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    const token = await this.tokenRepository.findLatestByUserId(userId);
    if (!token) {
      throw new ValidationError('Código de verificação não encontrado. Solicite uma nova alteração.');
    }

    if (token.expiresAt < new Date()) {
      throw new ValidationError('Código expirado. Solicite uma nova alteração.');
    }

    if (token.code !== code) {
      throw new ValidationError('Código de verificação inválido');
    }

    // Apply the new password
    await this.tokenRepository.markAsUsed(token.id);
    await this.userRepository.update(userId, { password: token.newPasswordHash });

    // Clean up all tokens for this user
    await this.tokenRepository.deleteByUserId(userId);
  }
}
