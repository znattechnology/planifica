import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

/**
 * GET /api/plans/notifications?year=2025/2026
 * Returns smart notifications combining calendar insights + plan awareness.
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
    const url = new URL(request.url);
    const academicYear = url.searchParams.get('year') || '';

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Parâmetro year é obrigatório' } },
        { status: 422 },
      );
    }

    // Resolve the user's calendar
    const calendar = await container.calendarResolutionService.resolve(user.id, academicYear);
    if (!calendar) {
      return NextResponse.json({
        success: true,
        data: {
          notifications: [],
          message: 'Nenhum calendário encontrado para este ano lectivo.',
        },
      });
    }

    // Fetch user's plans
    const plansResult = await container.planRepository.findByUserId(user.id, { page: 1, limit: 500 });

    // Generate smart notifications
    const notifications = container.smartNotificationService.generateNotifications(
      calendar,
      plansResult.data,
    );

    // Compute calendar impact score
    const impactScore = container.calendarImpactService.computeCalendarImpactScore(calendar);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        calendarImpactScore: impactScore.score,
        calendarImpactBreakdown: impactScore.breakdown,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
