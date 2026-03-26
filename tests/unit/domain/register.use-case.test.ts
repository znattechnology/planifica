import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUseCase } from '@/src/domain/use-cases/auth/register.use-case';
import { UserRole } from '@/src/domain/entities/user.entity';
import { ValidationError } from '@/src/domain/errors/domain.error';
import type { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import type { IHashService } from '@/src/domain/interfaces/services/hash.service';
import type { IEmailService } from '@/src/domain/interfaces/services/email.service';
import type { IEmailVerificationTokenRepository } from '@/src/domain/interfaces/repositories/email-verification-token.repository';
import type { IJwtService } from '@/src/domain/interfaces/services/jwt.service';

const createdUser = {
  id: 'user-new',
  email: 'novo@escola.ao',
  name: 'Novo Professor',
  emailVerified: false,
  onboardingCompleted: false,
  role: UserRole.TEACHER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let userRepository: IUserRepository;
  let hashService: IHashService;
  let emailService: IEmailService;
  let tokenRepository: IEmailVerificationTokenRepository;
  let jwtService: IJwtService;

  beforeEach(() => {
    userRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByEmailWithPassword: vi.fn(),
      findByIdWithPassword: vi.fn(),
      create: vi.fn().mockResolvedValue(createdUser),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      findBySchool: vi.fn(),
      countByRole: vi.fn(),
    };

    hashService = {
      hash: vi.fn().mockResolvedValue('hashed_pw'),
      compare: vi.fn(),
    };

    emailService = {
      sendVerificationCodeEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn(),
      sendWelcomeEmail: vi.fn(),
      sendPasswordChangeCodeEmail: vi.fn(),
    };

    tokenRepository = {
      create: vi.fn().mockResolvedValue(undefined),
      findLatestByUserId: vi.fn(),
      markAsUsed: vi.fn(),
      deleteByUserId: vi.fn(),
    };

    jwtService = {
      signAccessToken: vi.fn(),
      signRefreshToken: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
      signVerificationToken: vi.fn().mockResolvedValue('verification-token'),
      verifyVerificationToken: vi.fn(),
    };

    useCase = new RegisterUseCase(userRepository, hashService, emailService, tokenRepository, jwtService);
  });

  it('should register a new user and return verification token', async () => {
    const result = await useCase.execute({
      name: 'Novo Professor',
      email: 'novo@escola.ao',
      password: 'Senha123!',
    });

    expect(result.requiresVerification).toBe(true);
    expect(result.email).toBe('novo@escola.ao');
    expect(result.verificationToken).toBe('verification-token');
  });

  it('should throw ValidationError if email already registered', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(createdUser);

    await expect(
      useCase.execute({ name: 'Test', email: 'novo@escola.ao', password: 'test' }),
    ).rejects.toThrow(ValidationError);
  });

  it('should hash the password before storing', async () => {
    await useCase.execute({ name: 'Test', email: 'novo@escola.ao', password: 'Senha123!' });

    expect(hashService.hash).toHaveBeenCalledWith('Senha123!');
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed_pw' }),
    );
  });

  it('should create user with TEACHER role by default', async () => {
    await useCase.execute({ name: 'Test', email: 'novo@escola.ao', password: 'test' });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.TEACHER }),
    );
  });

  it('should create verification token', async () => {
    await useCase.execute({ name: 'Test', email: 'novo@escola.ao', password: 'test' });

    expect(tokenRepository.create).toHaveBeenCalledWith(
      'user-new',
      expect.any(String), // 6-digit code
      expect.any(Date),
    );
  });

  it('should send verification email (non-blocking)', async () => {
    await useCase.execute({ name: 'Test', email: 'novo@escola.ao', password: 'test' });

    expect(emailService.sendVerificationCodeEmail).toHaveBeenCalledWith(
      'novo@escola.ao',
      expect.any(String),
      'Novo Professor',
    );
  });
});
