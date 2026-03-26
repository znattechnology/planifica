import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { setAuthCookies } from '@/src/shared/lib/auth-cookies';
import { loginSchema } from '@/src/application/validators/auth.validator';
import { EmailNotVerifiedError } from '@/src/domain/errors/domain.error';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`login:${ip}`, RATE_LIMITS.LOGIN);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 422 },
      );
    }

    const result = await container.authController.login(parsed.data);

    const response = NextResponse.json(
      { success: true, data: { user: result.user } },
      { status: 200 },
    );

    return setAuthCookies(response, result.tokens);
  } catch (err) {
    if (err instanceof EmailNotVerifiedError) {
      // Return a signed verification token instead of raw userId
      const verificationToken = await container.jwtService.signVerificationToken(err.userId);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'EMAIL_NOT_VERIFIED',
            verificationToken,
            email: err.email,
          },
        },
        { status: 403 },
      );
    }
    return handleApiError(err);
  }
}
