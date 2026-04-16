import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/onboarding'];
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/favicon');
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname);
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}


export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let all API routes handle their own auth (they return JSON 401, not redirects)
  if (isApiPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static/public paths
  if (isPublicPath(pathname) && !isAuthPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access-token')?.value;
  const refreshToken = request.cookies.get('refresh-token')?.value;

  let isAuthenticated = false;

  if (accessToken) {
    try {
      const jwtSecret = process.env.NEXTAUTH_SECRET;
      if (!jwtSecret) {
        return NextResponse.next();
      }
      const secret = new TextEncoder().encode(jwtSecret);
      await jwtVerify(accessToken, secret);
      isAuthenticated = true;
    } catch {
      // Token expired or invalid — will try refresh below
    }
  }

  // If access token invalid but refresh token exists, verify its signature
  // before letting the request through. The client-side AuthProvider will
  // handle generating a new access token via /api/auth/refresh.
  if (!isAuthenticated && refreshToken) {
    try {
      const jwtSecret = process.env.NEXTAUTH_SECRET;
      if (jwtSecret) {
        const secret = new TextEncoder().encode(jwtSecret);
        await jwtVerify(refreshToken, secret);
        isAuthenticated = true;
      }
    } catch {
      // Refresh token is invalid or expired — user must re-login
    }
  }

  // Authenticated users trying to access auth pages → redirect to dashboard
  if (isAuthenticated && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated users trying to access protected pages → redirect to login
  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
