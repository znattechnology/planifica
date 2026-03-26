import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { registerSchema } from '@/src/application/validators/auth.validator';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`register:${ip}`, RATE_LIMITS.REGISTER);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 422 },
      );
    }

    const result = await container.authController.register(parsed.data);

    return NextResponse.json(
      {
        success: true,
        data: {
          verificationToken: result.verificationToken,
          email: result.email,
          requiresVerification: true,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
