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

    // Set the user's selected calendar.
    // Calendars are created by admins — the user only selects one during onboarding.
    // If no calendar was selected, try to auto-select the ministerial calendar for this year.
    const selectedCalendarId = parsed.data.selectedCalendarId;
    if (selectedCalendarId) {
      try {
        await container.userRepository.update(user.id, { selectedCalendarId });
      } catch { /* non-critical */ }
    } else {
      // No selection — try to auto-assign the ministerial calendar
      try {
        const ministerial = await container.schoolCalendarRepository.findActiveMinisterial(
          parsed.data.academicYear,
        );
        if (ministerial) {
          await container.userRepository.update(user.id, { selectedCalendarId: ministerial.id });
        }
      } catch { /* non-critical */ }
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
