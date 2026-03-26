import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUseCase } from '@/src/domain/use-cases/auth/login.use-case';
import { UserRole } from '@/src/domain/entities/user.entity';
import { UnauthorizedError, EmailNotVerifiedError } from '@/src/domain/errors/domain.error';
import type { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import type { IHashService } from '@/src/domain/interfaces/services/hash.service';
import type { IJwtService } from '@/src/domain/interfaces/services/jwt.service';

const mockUser = {
  id: 'user-1',
  email: 'prof@escola.ao',
  name: 'Professor Teste',
  password: 'hashed_password',
  emailVerified: true,
  onboardingCompleted: true,
  role: UserRole.TEACHER,
  school: 'Escola 123',
  subject: 'Matemática',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepository: IUserRepository;
  let hashService: IHashService;
  let jwtService: IJwtService;

  beforeEach(() => {
    userRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByEmailWithPassword: vi.fn().mockResolvedValue(mockUser),
      findByIdWithPassword: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      findBySchool: vi.fn(),
      countByRole: vi.fn(),
    };

    hashService = {
      hash: vi.fn(),
      compare: vi.fn().mockResolvedValue(true),
    };

    jwtService = {
      signAccessToken: vi.fn().mockResolvedValue('access-token'),
      signRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
      signVerificationToken: vi.fn(),
      verifyVerificationToken: vi.fn(),
    };

    useCase = new LoginUseCase(userRepository, hashService, jwtService);
  });

  it('should return user and tokens on successful login', async () => {
    const result = await useCase.execute({ email: 'prof@escola.ao', password: 'senha123' });

    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('prof@escola.ao');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.tokens.refreshToken).toBe('refresh-token');
  });

  it('should throw UnauthorizedError if user not found', async () => {
    vi.mocked(userRepository.findByEmailWithPassword).mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'nao@existe.ao', password: 'teste' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw EmailNotVerifiedError if email not verified', async () => {
    vi.mocked(userRepository.findByEmailWithPassword).mockResolvedValue({
      ...mockUser,
      emailVerified: false,
    });

    await expect(
      useCase.execute({ email: 'prof@escola.ao', password: 'senha123' }),
    ).rejects.toThrow(EmailNotVerifiedError);
  });

  it('should check email verification BEFORE password', async () => {
    vi.mocked(userRepository.findByEmailWithPassword).mockResolvedValue({
      ...mockUser,
      emailVerified: false,
    });

    await expect(
      useCase.execute({ email: 'prof@escola.ao', password: 'wrong' }),
    ).rejects.toThrow(EmailNotVerifiedError);

    // hashService.compare should NOT have been called
    expect(hashService.compare).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError if password does not match', async () => {
    vi.mocked(hashService.compare).mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'prof@escola.ao', password: 'errada' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should generate both access and refresh tokens', async () => {
    await useCase.execute({ email: 'prof@escola.ao', password: 'senha123' });

    expect(jwtService.signAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
        email: 'prof@escola.ao',
        role: UserRole.TEACHER,
      }),
    );
    expect(jwtService.signRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1' }),
    );
  });

  it('should not include password in returned user', async () => {
    const result = await useCase.execute({ email: 'prof@escola.ao', password: 'senha123' });

    expect(result.user).not.toHaveProperty('password');
  });
});
