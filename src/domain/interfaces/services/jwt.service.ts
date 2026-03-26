export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IJwtService {
  signAccessToken(payload: JwtPayload): Promise<string>;
  signRefreshToken(payload: JwtPayload): Promise<string>;
  verifyAccessToken(token: string): Promise<JwtPayload>;
  verifyRefreshToken(token: string): Promise<JwtPayload>;
  signVerificationToken(userId: string): Promise<string>;
  verifyVerificationToken(token: string): Promise<string>;
}
