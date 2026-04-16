import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { UserRole } from '@/src/domain/entities/user.entity';

/**
 * GET /api/admin/calendars/event-types — List all event type configs
 * Query: ?schoolId=xxx (optional, includes system + school-specific)
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
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.COORDINATOR) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const schoolId = url.searchParams.get('schoolId');

    const types = schoolId
      ? await container.calendarEventTypeConfigRepository.findBySchool(schoolId)
      : await container.calendarEventTypeConfigRepository.findAll();

    return NextResponse.json({ success: true, data: types });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/admin/calendars/event-types — Create a custom event type
 * Body: { name, label, color, schoolId? }
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
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.COORDINATOR) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, label, color, schoolId } = body;

    if (!name || !label) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'name e label são obrigatórios' } },
        { status: 422 },
      );
    }

    const config = await container.calendarEventTypeConfigRepository.create({
      name,
      label,
      color: color || '#6B7280',
      schoolId: schoolId || undefined,
      isSystem: false,
    });

    return NextResponse.json(
      { success: true, data: config },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/calendars/event-types?id=xxx — Delete a custom event type
 * Only non-system types can be deleted.
 */
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
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.COORDINATOR) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'id é obrigatório' } },
        { status: 422 },
      );
    }

    const config = await container.calendarEventTypeConfigRepository.findById(id);
    if (!config) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tipo não encontrado' } },
        { status: 404 },
      );
    }

    if (config.isSystem) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Tipos de sistema não podem ser eliminados' } },
        { status: 403 },
      );
    }

    await container.calendarEventTypeConfigRepository.delete(id);

    return NextResponse.json({ success: true, data: { message: 'Tipo eliminado' } });
  } catch (err) {
    return handleApiError(err);
  }
}
