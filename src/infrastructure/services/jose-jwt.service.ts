import { SignJWT, jwtVerify } from 'jose';
import { IJwtService, JwtPayload } from '@/src/domain/interfaces/services/jwt.service';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const VERIFICATION_TOKEN_EXPIRY = '15m';

export class JoseJwtService implements IJwtService {
  private readonly secret: Uint8Array;

  constructor(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  async signAccessToken(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload, type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .setSubject(payload.sub)
      .sign(this.secret);
  }

  async signRefreshToken(payload: JwtPayload): Promise<string> {
    return new SignJWT({ ...payload, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .setSubject(payload.sub)
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    if (payload.type !== 'access') {
      throw new Error('Invalid token type: expected access token');
    }
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type: expected refresh token');
    }
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  }

  async signVerificationToken(userId: string): Promise<string> {
    return new SignJWT({ sub: userId, type: 'verification' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(VERIFICATION_TOKEN_EXPIRY)
      .setSubject(userId)
      .sign(this.secret);
  }

  async verifyVerificationToken(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.secret);
    if (payload.type !== 'verification') {
      throw new Error('Invalid token type: expected verification token');
    }
    return payload.sub as string;
  }
}
