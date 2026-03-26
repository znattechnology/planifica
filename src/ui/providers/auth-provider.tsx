'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { API_ROUTES, ROUTES } from '@/src/shared/constants/routes.constants';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
  role: string;
  school?: string;
  subject?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyEmail: (verificationToken: string, code: string) => Promise<void>;
  resendCode: (verificationToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.AUTH_ME);
      if (res.ok) {
        const data = await res.json();
        setUser(data.data.user);
      } else if (res.status === 401) {
        const refreshRes = await fetch(API_ROUTES.AUTH_REFRESH, { method: 'POST' });
        if (refreshRes.ok) {
          const retryRes = await fetch(API_ROUTES.AUTH_ME);
          if (retryRes.ok) {
            const data = await retryRes.json();
            setUser(data.data.user);
            return;
          }
        }
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (!isLoading && user && !user.onboardingCompleted && pathname !== ROUTES.ONBOARDING) {
      router.push(ROUTES.ONBOARDING);
    }
  }, [isLoading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(API_ROUTES.AUTH_LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error?.code === 'EMAIL_NOT_VERIFIED') {
        const vt = data.error.verificationToken;
        const userEmail = data.error.email;
        router.push(`${ROUTES.VERIFY_EMAIL}?vt=${encodeURIComponent(vt)}&email=${encodeURIComponent(userEmail)}`);
        return;
      }
      throw new Error(data.error?.message || 'Erro ao iniciar sessão');
    }

    setUser(data.data.user);
    if (!data.data.user.onboardingCompleted) {
      router.push(ROUTES.ONBOARDING);
    } else {
      router.push(ROUTES.DASHBOARD);
    }
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(API_ROUTES.AUTH_REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Erro ao criar conta');
    }

    const vt = data.data.verificationToken;
    const userEmail = data.data.email;
    router.push(`${ROUTES.VERIFY_EMAIL}?vt=${encodeURIComponent(vt)}&email=${encodeURIComponent(userEmail)}`);
  }, [router]);

  const verifyEmail = useCallback(async (verificationToken: string, code: string) => {
    const res = await fetch(API_ROUTES.AUTH_VERIFY_EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken, code }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Erro ao verificar email');
    }

    setUser(data.data.user);
    if (!data.data.user.onboardingCompleted) {
      router.push(ROUTES.ONBOARDING);
    } else {
      router.push(ROUTES.DASHBOARD);
    }
  }, [router]);

  const resendCode = useCallback(async (verificationToken: string) => {
    const res = await fetch(API_ROUTES.AUTH_RESEND_CODE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Erro ao reenviar código');
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(API_ROUTES.AUTH_LOGOUT, { method: 'POST' });
    setUser(null);
    router.push(ROUTES.LOGIN);
  }, [router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser, verifyEmail, resendCode }}>
      {children}
    </AuthContext.Provider>
  );
}
