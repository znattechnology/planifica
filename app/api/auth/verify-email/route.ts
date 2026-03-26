import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { setAuthCookies } from '@/src/shared/lib/auth-cookies';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`verify:${ip}`, RATE_LIMITS.VERIFY_CODE);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();
    const { verificationToken, code } = body;

    if (!verificationToken || !code) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Token e código são obrigatórios' } },
        { status: 422 },
      );
    }

    // Extract userId from signed token — prevents tampering
    let userId: string;
    try {
      userId = await container.jwtService.verifyVerificationToken(verificationToken);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Token de verificação inválido ou expirado' } },
        { status: 401 },
      );
    }

    const result = await container.authController.verifyEmail(userId, code);

    const response = NextResponse.json(
      { success: true, data: { user: result.user } },
      { status: 200 },
    );

    return setAuthCookies(response, result.tokens);
  } catch (err) {
    return handleApiError(err);
  }
}
