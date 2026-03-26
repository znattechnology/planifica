import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

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

    const { academicYear, title, description, startDate, endDate, type, allDay } = body;

    if (!academicYear || !title || !startDate || !endDate || !type) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Campos obrigatórios em falta' } },
        { status: 422 },
      );
    }

    const event = await container.manageCalendarEventsUseCase.addEvent(user.id, academicYear, {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      allDay: allDay ?? true,
    });

    return NextResponse.json(
      { success: true, data: { event } },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
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
    const eventId = url.searchParams.get('id');
    const academicYear = url.searchParams.get('year');

    if (!eventId || !academicYear) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ID do evento e ano lectivo são obrigatórios' } },
        { status: 422 },
      );
    }

    await container.manageCalendarEventsUseCase.removeEvent(user.id, academicYear, eventId);

    return NextResponse.json({ success: true, data: { message: 'Evento removido' } });
  } catch (err) {
    return handleApiError(err);
  }
}
