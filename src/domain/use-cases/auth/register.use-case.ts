import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IHashService } from '@/src/domain/interfaces/services/hash.service';
import { IEmailService } from '@/src/domain/interfaces/services/email.service';
import { IEmailVerificationTokenRepository } from '@/src/domain/interfaces/repositories/email-verification-token.repository';
import { IJwtService } from '@/src/domain/interfaces/services/jwt.service';
import { User, UserRole } from '@/src/domain/entities/user.entity';
import { ValidationError } from '@/src/domain/errors/domain.error';
import { randomInt } from 'crypto';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterOutput {
  verificationToken: string;
  email: string;
  requiresVerification: true;
}

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly emailService: IEmailService,
    private readonly tokenRepository: IEmailVerificationTokenRepository,
    private readonly jwtService: IJwtService,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ValidationError('Este email já está registado');
    }

    const hashedPassword = await this.hashService.hash(input.password);

    const user = await this.userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: UserRole.TEACHER,
    } as Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string });

    // Generate 6-digit verification code
    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.tokenRepository.create(user.id, code, expiresAt);

    // Send verification code email (non-blocking)
    this.emailService.sendVerificationCodeEmail(user.email, code, user.name).catch(() => {});

    // Return signed verification token instead of raw userId
    const verificationToken = await this.jwtService.signVerificationToken(user.id);

    return {
      verificationToken,
      email: user.email,
      requiresVerification: true,
    };
  }
}
