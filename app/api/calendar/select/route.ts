import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

/**
 * POST /api/calendar/select — Select a calendar for the current user
 * Body: { calendarId: string }
 *
 * Domain-level guard enforced in CalendarResolutionService.changeCalendar():
 * 1. Calendar must exist and be active
 * 2. User cannot change calendar after creating plans
 */
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
    const { calendarId } = body;

    if (!calendarId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'calendarId é obrigatório' } },
        { status: 422 },
      );
    }

    // Domain-level guard handles validation, plan-existence check, and cache invalidation
    await container.calendarResolutionService.changeCalendar(user.id, calendarId);

    const calendar = await container.schoolCalendarRepository.findById(calendarId);

    return NextResponse.json({
      success: true,
      data: { selectedCalendarId: calendarId, calendar },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
