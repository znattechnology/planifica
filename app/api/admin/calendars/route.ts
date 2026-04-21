import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { UserRole } from '@/src/domain/entities/user.entity';
import { CalendarType } from '@/src/domain/entities/school-calendar.entity';

function requireAdmin(user: { role: string }) {
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.COORDINATOR) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
      { status: 403 },
    );
  }
  return null;
}

/**
 * GET /api/admin/calendars — List all calendars (ministerial + school)
 * Query params: ?type=MINISTERIAL|SCHOOL&year=2025/2026
 */
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
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type') as CalendarType | null;
    const yearFilter = url.searchParams.get('year');

    // Fetch both types and merge
    const ministerial = await container.schoolCalendarRepository.findByType(
      CalendarType.MINISTERIAL,
      yearFilter || undefined,
    );
    const school = await container.schoolCalendarRepository.findByType(
      CalendarType.SCHOOL,
      yearFilter || undefined,
    );

    let calendars = [...ministerial, ...school];

    if (typeFilter) {
      calendars = calendars.filter(c => c.type === typeFilter);
    }

    // Sort: active first, then by createdAt desc
    calendars.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      data: calendars.map(c => ({
        id: c.id,
        type: c.type,
        academicYear: c.academicYear,
        schoolName: c.schoolName,
        schoolId: c.schoolId,
        country: c.country,
        isActive: c.isActive,
        version: c.version,
        startDate: c.startDate,
        endDate: c.endDate,
        termsCount: c.terms.length,
        eventsCount: c.events.length,
        terms: c.terms.map(t => ({
          trimester: t.trimester,
          name: t.name,
          startDate: t.startDate,
          endDate: t.endDate,
          teachingWeeks: t.teachingWeeks,
        })),
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/admin/calendars — Create a calendar (admin creates for any school)
 * Body: { academicYear, schoolName, type?, schoolId? }
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
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { academicYear, schoolName, type, schoolId } = body;

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Ano lectivo é obrigatório' } },
        { status: 422 },
      );
    }

    // Validate year format YYYY/YYYY
    if (!/^\d{4}\/\d{4}$/.test(academicYear)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Formato do ano letivo inválido. Use YYYY/YYYY (ex: 2026/2027)' } },
        { status: 422 },
      );
    }

    const calendarType = type === 'MINISTERIAL' ? CalendarType.MINISTERIAL : CalendarType.SCHOOL;

    // SCHOOL calendars require a schoolName
    if (calendarType === CalendarType.SCHOOL && !schoolName) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'schoolName é obrigatório para calendários escolares' } },
        { status: 422 },
      );
    }

    const calendar = await container.createSchoolCalendarUseCase.execute(user.id, {
      academicYear,
      country: 'Angola',
      schoolName: calendarType === CalendarType.MINISTERIAL ? undefined : schoolName,
      type: calendarType,
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
 * PATCH /api/admin/calendars — Toggle active status
 * Body: { calendarId, isActive }
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
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const body = await request.json();
    const { calendarId, isActive } = body;

    if (!calendarId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'calendarId e isActive são obrigatórios' } },
        { status: 422 },
      );
    }

    const updated = await container.schoolCalendarRepository.update(calendarId, { isActive });

    await container.calendarResolutionService.invalidateCalendarCache(
      'admin_calendar_toggle',
      { calendarId, isActive, updatedBy: user.id },
    );

    return NextResponse.json({ success: true, data: { calendar: updated } });
  } catch (err) {
    return handleApiError(err);
  }
}
