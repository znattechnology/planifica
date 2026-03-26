import { LoginUseCase, LoginInput } from '@/src/domain/use-cases/auth/login.use-case';
import { RegisterUseCase, RegisterInput } from '@/src/domain/use-cases/auth/register.use-case';
import { RefreshTokenUseCase } from '@/src/domain/use-cases/auth/refresh-token.use-case';
import { ForgotPasswordUseCase } from '@/src/domain/use-cases/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from '@/src/domain/use-cases/auth/reset-password.use-case';
import { UpdateProfileUseCase, UpdateProfileInput } from '@/src/domain/use-cases/auth/update-profile.use-case';
import { VerifyEmailUseCase } from '@/src/domain/use-cases/auth/verify-email.use-case';
import { ResendVerificationCodeUseCase } from '@/src/domain/use-cases/auth/resend-verification-code.use-case';
import { RequestPasswordChangeUseCase } from '@/src/domain/use-cases/auth/request-password-change.use-case';
import { ConfirmPasswordChangeUseCase } from '@/src/domain/use-cases/auth/confirm-password-change.use-case';
import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IJwtService, JwtPayload } from '@/src/domain/interfaces/services/jwt.service';
import { UnauthorizedError } from '@/src/domain/errors/domain.error';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationCodeUseCase: ResendVerificationCodeUseCase,
    private readonly requestPasswordChangeUseCase: RequestPasswordChangeUseCase,
    private readonly confirmPasswordChangeUseCase: ConfirmPasswordChangeUseCase,
    private readonly userRepository: IUserRepository,
    private readonly jwtService: IJwtService,
    private readonly logger: ILogger,
  ) {}

  async login(input: LoginInput) {
    this.logger.info('Login attempt', { email: input.email });
    const result = await this.loginUseCase.execute(input);
    this.logger.info('Login successful', { userId: result.user.id });
    return result;
  }

  async register(input: RegisterInput) {
    this.logger.info('Registration attempt', { email: input.email });
    const result = await this.registerUseCase.execute(input);
    this.logger.info('Registration successful — verification required', { email: result.email });
    return result;
  }

  async verifyEmail(userId: string, code: string) {
    this.logger.info('Email verification attempt', { userId });
    const result = await this.verifyEmailUseCase.execute(userId, code);
    this.logger.info('Email verified successfully', { userId });
    return result;
  }

  async resendVerificationCode(userId: string) {
    this.logger.info('Resend verification code', { userId });
    await this.resendVerificationCodeUseCase.execute(userId);
    this.logger.info('Verification code resent', { userId });
  }

  async refresh(refreshToken: string) {
    return this.refreshTokenUseCase.execute(refreshToken);
  }

  async forgotPassword(email: string) {
    this.logger.info('Password reset requested', { email });
    await this.forgotPasswordUseCase.execute(email);
  }

  async resetPassword(token: string, newPassword: string) {
    this.logger.info('Password reset attempt');
    await this.resetPasswordUseCase.execute(token, newPassword);
    this.logger.info('Password reset successful');
  }

  async requestPasswordChange(userId: string, currentPassword: string, newPassword: string) {
    this.logger.info('Password change request — sending verification code', { userId });
    await this.requestPasswordChangeUseCase.execute(userId, currentPassword, newPassword);
    this.logger.info('Password change verification code sent', { userId });
  }

  async confirmPasswordChange(userId: string, code: string) {
    this.logger.info('Password change confirmation attempt', { userId });
    await this.confirmPasswordChangeUseCase.execute(userId, code);
    this.logger.info('Password changed successfully via code', { userId });
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    this.logger.info('Profile update attempt', { userId });
    const user = await this.updateProfileUseCase.execute(userId, input);
    this.logger.info('Profile updated', { userId });
    return user;
  }

  async me(accessToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAccessToken(accessToken);
    } catch {
      throw new UnauthorizedError('Token inválido');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      onboardingCompleted: user.onboardingCompleted,
      role: user.role,
      school: user.school,
      subject: user.subject,
    };
  }
}
