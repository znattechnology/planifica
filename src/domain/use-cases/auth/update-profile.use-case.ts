import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { User } from '@/src/domain/entities/user.entity';
import { UnauthorizedError, ValidationError } from '@/src/domain/errors/domain.error';

export interface UpdateProfileInput {
  name: string;
  email: string;
  school?: string;
  subject?: string;
}

export class UpdateProfileUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<Omit<User, 'createdAt' | 'updatedAt'>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    // Check if email changed and is already taken
    if (input.email !== user.email) {
      const existing = await this.userRepository.findByEmail(input.email);
      if (existing) {
        throw new ValidationError('Este email já está em uso');
      }
    }

    const updated = await this.userRepository.update(userId, {
      name: input.name,
      email: input.email,
      school: input.school || undefined,
      subject: input.subject || undefined,
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      emailVerified: updated.emailVerified,
      onboardingCompleted: updated.onboardingCompleted,
      role: updated.role,
      school: updated.school,
      subject: updated.subject,
    };
  }
}
