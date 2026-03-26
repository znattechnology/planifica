import { IUserRepository } from '@/src/domain/interfaces/repositories/user.repository';
import { IJwtService, TokenPair, JwtPayload } from '@/src/domain/interfaces/services/jwt.service';
import { UnauthorizedError } from '@/src/domain/errors/domain.error';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: IJwtService,
  ) {}

  async execute(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Token de actualização inválido');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('Utilizador não encontrado');
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAccessToken(newPayload),
      this.jwtService.signRefreshToken(newPayload),
    ]);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}
