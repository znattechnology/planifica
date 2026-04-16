import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { UserRole } from '@/src/domain/entities/user.entity';

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

    const url = new URL(request.url);
    const academicYear = url.searchParams.get('year');
    const available = url.searchParams.get('available');

    // GET /api/calendar?available=true&year=2025/2026&school=Escola... — calendars user can select
    if (available === 'true' && academicYear) {
      // Use school from query param (onboarding passes it) or from user profile
      const schoolParam = url.searchParams.get('school');
      const schoolName = schoolParam || user.school || undefined;
      const result = await container.calendarResolutionService.getAvailableCalendars(
        user.id, academicYear, schoolName,
      );

      // Serialize to a clean, lightweight response for the frontend
      return NextResponse.json({
        success: true,
        data: {
          ministerial: result.ministerial ? {
            id: result.ministerial.id,
            type: result.ministerial.type,
            academicYear: result.ministerial.academicYear,
            schoolName: result.ministerial.schoolName,
            termsCount: result.ministerial.terms.length,
            eventsCount: result.ministerial.events.length,
          } : null,
          schoolCalendars: result.schoolCalendars.map(sc => ({
            id: sc.id,
            type: sc.type,
            academicYear: sc.academicYear,
            schoolName: sc.schoolName,
            termsCount: sc.terms.length,
            eventsCount: sc.events.length,
          })),
          options: result.options.map(opt => ({
            calendar: {
              id: opt.calendar.id,
              type: opt.calendar.type,
              academicYear: opt.calendar.academicYear,
              schoolName: opt.calendar.schoolName,
              termsCount: opt.calendar.terms.length,
              eventsCount: opt.calendar.events.length,
            },
            isRecommended: opt.isRecommended,
            reason: opt.reason,
          })),
        },
      });
    }

    if (academicYear) {
      const ownedCalendar = await container.getSchoolCalendarUseCase.getByYear(user.id, academicYear);
      // Resolve the active calendar for this user (selected during onboarding, or fallback)
      const activeCalendar = await container.calendarResolutionService.resolve(user.id, academicYear);

      // The effective calendar is: user's own if it exists, otherwise the resolved active one
      const calendar = ownedCalendar || activeCalendar;

      // Generate insights if a calendar exists
      const insights = calendar
        ? container.calendarInsightsService.generateInsights(calendar)
        : null;

      return NextResponse.json({
        success: true,
        data: {
          calendar,
          activeCalendar: activeCalendar ? {
            id: activeCalendar.id,
            type: activeCalendar.type,
            schoolName: activeCalendar.schoolName,
            version: activeCalendar.version,
            isActive: activeCalendar.isActive,
          } : null,
          isSharedCalendar: !ownedCalendar && !!activeCalendar,
          ...(insights ? { insights: insights.insights, stats: insights.stats } : {}),
        },
      });
    }

    const calendars = await container.getSchoolCalendarUseCase.getAll(user.id);
    return NextResponse.json({ success: true, data: { calendars } });
  } catch (err) {
    return handleApiError(err);
  }
}

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

    const { academicYear, schoolName, type, schoolId } = body;

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Ano lectivo é obrigatório' } },
        { status: 422 },
      );
    }

    const calendar = await container.createSchoolCalendarUseCase.execute(user.id, {
      academicYear,
      country: 'Angola',
      schoolName,
      type,
      schoolId,
    });

    return NextResponse.json(
      { success: true, data: { calendar } },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/calendar — Activate/deactivate a calendar (admin only)
 * Body: { calendarId: string, isActive: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      );
    }

    const user = await container.authController.me(accessToken);
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.COORDINATOR) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Apenas administradores podem gerir calendários' } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { calendarId, isActive, schoolName, schoolId } = body;

    if (!calendarId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'calendarId é obrigatório' } },
        { status: 422 },
      );
    }

    const updated = await container.schoolCalendarRepository.update(calendarId, {
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(schoolName ? { schoolName } : {}),
      ...(schoolId ? { schoolId } : {}),
    });

    // Invalidate plan cache — calendar changes affect plan generation
    await container.calendarResolutionService.invalidateCalendarCache(
      'admin_calendar_update',
      { calendarId, isActive, updatedBy: user.id },
    );

    return NextResponse.json({ success: true, data: { calendar: updated } });
  } catch (err) {
    return handleApiError(err);
  }
}
