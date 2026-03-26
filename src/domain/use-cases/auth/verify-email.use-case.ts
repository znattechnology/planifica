import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IEmailVerificationTokenRepository } from '@/src/domain/interfaces/repositories/email-verification-token.repository';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';
import { IJwtService, TokenPair, JwtPayload } from '@/src/domain/interfaces/services/jwt.service';
import { User } from '@/src/domain/entities/user.entity';
import { ValidationError, UnauthorizedError } from '@/src/domain/errors/domain.error';

export interface VerifyEmailOutput {
  user: Omit<User, 'createdAt' | 'updatedAt'>;
  tokens: TokenPair;
}

export class VerifyEmailUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenRepository: IEmailVerificationTokenRepository,
    private readonly emailService: IEmailService,
    private readonly jwtService: IJwtService,
  ) {}

  async execute(userId: string, code: string): Promise<VerifyEmailOutput> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    if (user.emailVerified) {
      throw new ValidationError('Email já verificado');
    }

    const token = await this.tokenRepository.findLatestByUserId(userId);
    if (!token) {
      throw new ValidationError('Código de verificação não encontrado. Solicite um novo código.');
    }

    if (token.expiresAt < new Date()) {
      throw new ValidationError('Código expirado. Solicite um novo código.');
    }

    if (token.code !== code) {
      throw new ValidationError('Código de verificação inválido');
    }

    await this.tokenRepository.markAsUsed(token.id);
    await this.userRepository.update(userId, { emailVerified: true });

    // Send welcome email (non-blocking)
    this.emailService.sendWelcomeEmail(user.email, user.name).catch(() => {});

    // Generate tokens so user is logged in after verification
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken(payload),
      this.jwtService.signRefreshToken(payload),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
        onboardingCompleted: user.onboardingCompleted,
        role: user.role,
        school: user.school,
        subject: user.subject,
      },
      tokens: { accessToken, refreshToken },
    };
  }
}
