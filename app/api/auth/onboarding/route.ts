import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { onboardingSchema } from '@/src/application/validators/onboarding.validator';

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      );
    }

    const user = await container.authController.me(accessToken);
    const body = await request.json();

    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 422 },
      );
    }

    const profile = await container.completeOnboardingUseCase.execute(user.id, parsed.data);

    // Auto-generate Angola school calendar when onboarding completes
    try {
      await container.createSchoolCalendarUseCase.execute(user.id, {
        academicYear: parsed.data.academicYear,
        country: parsed.data.country || 'Angola',
        schoolName: parsed.data.schoolName,
      });
    } catch {
      // Calendar may already exist — ignore duplicate errors
    }

    return NextResponse.json(
      { success: true, data: { profile } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      );
    }

    const user = await container.authController.me(accessToken);
    const profile = await container.teacherProfileRepository.findByUserId(user.id);

    return NextResponse.json(
      { success: true, data: { profile } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
