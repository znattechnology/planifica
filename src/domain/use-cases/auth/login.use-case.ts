import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IHashService } from '@/src/domain/interfaces/services/hash.service';
import { IJwtService, TokenPair, JwtPayload } from '@/src/domain/interfaces/services/jwt.service';
import { User } from '@/src/domain/entities/user.entity';
import { UnauthorizedError, EmailNotVerifiedError } from '@/src/domain/errors/domain.error';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  user: Omit<User, 'createdAt' | 'updatedAt'>;
  tokens: TokenPair;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly jwtService: IJwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmailWithPassword(input.email);
    if (!user) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    // Check email verification BEFORE password — prevents confirming
    // whether a password is correct for unverified accounts
    if (!user.emailVerified) {
      throw new EmailNotVerifiedError(user.id, user.email);
    }

    const passwordMatch = await this.hashService.compare(
      input.password,
      user.password,
    );
    if (!passwordMatch) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

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
        emailVerified: user.emailVerified,
        onboardingCompleted: user.onboardingCompleted,
        role: user.role,
        school: user.school,
        subject: user.subject,
      },
      tokens: { accessToken, refreshToken },
    };
  }
}
