import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { UserRole } from '@/src/domain/entities/user.entity';

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
 * POST /api/admin/calendars/[id]/events — Add event to any calendar (admin)
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
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const { id } = await params;
    const calendar = await container.schoolCalendarRepository.findById(id);
    if (!calendar) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Calendário não encontrado' } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { title, description, startDate, endDate, type, allDay } = body;

    if (!title || !startDate || !endDate || !type) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Campos obrigatórios: title, startDate, endDate, type' } },
        { status: 422 },
      );
    }

    const event = await container.schoolCalendarRepository.addEvent(id, {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      allDay: allDay ?? true,
      createdBy: user.id,
    });

    // Invalidate plan cache
    await container.calendarResolutionService.invalidateCalendarCache(
      'admin_event_added',
      { calendarId: id, eventTitle: title, updatedBy: user.id },
    );

    return NextResponse.json(
      { success: true, data: { event } },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/calendars/[id]/events?eventId=xxx — Remove event from any calendar (admin)
 */
export async function DELETE(
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
    const forbidden = requireAdmin(user);
    if (forbidden) return forbidden;

    const { id } = await params;
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'eventId é obrigatório' } },
        { status: 422 },
      );
    }

    const calendar = await container.schoolCalendarRepository.findById(id);
    if (!calendar) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Calendário não encontrado' } },
        { status: 404 },
      );
    }

    const event = calendar.events.find(e => e.id === eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Evento não encontrado' } },
        { status: 404 },
      );
    }

    await container.schoolCalendarRepository.removeEvent(eventId);

    // Invalidate plan cache
    await container.calendarResolutionService.invalidateCalendarCache(
      'admin_event_removed',
      { calendarId: id, eventId, updatedBy: user.id },
    );

    return NextResponse.json({ success: true, data: { message: 'Evento removido' } });
  } catch (err) {
    return handleApiError(err);
  }
}
