import { User } from '@/src/domain/entities/user.entity';

export interface IAuthService {
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(data: SignUpData): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  refreshToken(token: string): Promise<AuthResult>;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  school?: string;
  subject?: string;
}
