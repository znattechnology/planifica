import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { forgotPasswordSchema } from '@/src/application/validators/auth.validator';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`forgot-pw:${ip}`, RATE_LIMITS.FORGOT_PASSWORD);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 422 },
      );
    }

    await container.authController.forgotPassword(parsed.data.email);

    // Always return success to prevent email enumeration
    return NextResponse.json(
      { success: true, data: { message: 'Se o email existir, receberá instruções de recuperação' } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
