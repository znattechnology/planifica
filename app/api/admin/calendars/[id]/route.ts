import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { UserRole } from '@/src/domain/entities/user.entity';

/**
 * GET /api/admin/calendars/[id] — Fetch a single calendar with full details
 */
export async function GET(
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

    // Generate insights for admin
    const insightsResult = container.calendarInsightsService.generateInsights(calendar);

    return NextResponse.json({
      success: true,
      data: {
        calendar,
        insights: insightsResult.insights,
        stats: insightsResult.stats,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
