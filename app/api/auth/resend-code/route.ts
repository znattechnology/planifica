import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`resend:${ip}`, RATE_LIMITS.RESEND_CODE);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();
    const { verificationToken } = body;

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Token de verificação é obrigatório' } },
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

    await container.authController.resendVerificationCode(userId);

    return NextResponse.json(
      { success: true, data: { message: 'Código reenviado com sucesso' } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
