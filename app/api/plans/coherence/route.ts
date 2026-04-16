import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { PlanCoherenceService } from '@/src/ai/services/plan-coherence.service';
import { resolveCalendarContextWithMetadata } from '@/src/shared/utils/calendar-context';

/**
 * GET /api/plans/coherence?dosificacaoId=xxx
 *
 * Analyzes coherence across all generated plans for a given dosificação.
 * Returns a score (1-10), issues list, and summary.
 */
export async function GET(request: NextRequest) {
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
    const dosificacaoId = url.searchParams.get('dosificacaoId');

    if (!dosificacaoId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'dosificacaoId é obrigatório' } },
        { status: 422 },
      );
    }

    // Verify dosificação belongs to user
    const dosificacao = await container.dosificacaoRepository.findById(dosificacaoId);
    if (!dosificacao || dosificacao.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dosificação não encontrada' } },
        { status: 404 },
      );
    }

    // Fetch all plans for this dosificação
    const plans = await container.planRepository.findByDosificacaoId(dosificacaoId);

    // Fetch calendar context with metadata
    const { calendarContext, calendarInfo, fallbackUsed } = await resolveCalendarContextWithMetadata(
      user.id, dosificacao.academicYear,
      container.calendarResolutionService,
    );

    const coherenceService = new PlanCoherenceService();
    const report = coherenceService.analyze(plans, calendarContext);

    return NextResponse.json({
      success: true,
      data: report,
      calendar: calendarInfo ? { ...calendarInfo, fallbackUsed } : undefined,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
