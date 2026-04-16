import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { UserRole } from '@/src/domain/entities/user.entity';
import { CalendarEventType } from '@/src/domain/entities/school-calendar.entity';

/**
 * POST /api/admin/calendars/[id]/simulate-event
 * Simulate the impact of adding an event WITHOUT persisting it.
 *
 * Body: { title?, startDate, endDate, type }
 * Response: { affectedWeeks, totalLessonReduction, affectedPlansCount, message }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 },
      );
    }

    const { id } = await params;
    const calendar = await container.schoolCalendarRepository.findById(id);
    if (!calendar) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Calendário não encontrado' } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { title, startDate, endDate, type } = body;

    if (!startDate || !endDate || !type) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'startDate, endDate e type são obrigatórios' } },
        { status: 422 },
      );
    }

    // Simulate without persisting
    const simulation = container.calendarImpactService.simulateEventImpact(calendar, {
      title: title || 'Evento simulado',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type: type as CalendarEventType,
      allDay: true,
    });

    // Count affected plans — plans linked to this calendar
    // Use findAll with a large limit and filter by calendarId
    const allPlans = await container.planRepository.findAll({ page: 1, limit: 10000 });
    const affectedPlansCount = allPlans.data.filter(
      p => p.calendarId === calendar.id &&
        (p.status === 'GENERATED' || p.status === 'REVIEWED' || p.status === 'APPROVED'),
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        ...simulation,
        affectedPlansCount,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
