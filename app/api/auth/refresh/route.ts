import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { setAuthCookies } from '@/src/shared/lib/auth-cookies';
import { getRefreshToken } from '@/src/shared/lib/auth-cookies';

export async function POST(request: Request) {
  try {
    const refreshToken = getRefreshToken(request);

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Token de actualização não encontrado' } },
        { status: 401 },
      );
    }

    const tokens = await container.authController.refresh(refreshToken);

    const response = NextResponse.json(
      { success: true, data: { message: 'Tokens actualizados' } },
      { status: 200 },
    );

    return setAuthCookies(response, tokens);
  } catch (err) {
    return handleApiError(err);
  }
}
