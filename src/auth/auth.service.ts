import { User } from '@/src/domain/entities/user.entity';
import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IJwtService } from '@/src/domain/interfaces/services/jwt.service';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';
import { UnauthorizedError } from '@/src/domain/errors/domain.error';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: IJwtService,
    private readonly logger: ILogger,
  ) {}

  async validateSession(sessionUserId: string): Promise<User> {
    const user = await this.userRepository.findById(sessionUserId);
    if (!user) {
      this.logger.warn('Invalid session: user not found', { userId: sessionUserId });
      throw new UnauthorizedError('Invalid session');
    }
    return user;
  }

  async getUserFromRequest(request: Request): Promise<User> {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/access-token=([^;]+)/);
    const accessToken = match?.[1];

    if (!accessToken) {
      throw new UnauthorizedError('Não autenticado');
    }

    try {
      const payload = await this.jwtService.verifyAccessToken(accessToken);
      return this.validateSession(payload.sub);
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      this.logger.warn('Invalid access token');
      throw new UnauthorizedError('Token inválido');
    }
  }
}
