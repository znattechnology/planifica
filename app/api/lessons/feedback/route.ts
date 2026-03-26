import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { SubmitLessonFeedbackUseCase } from '@/src/domain/use-cases/lesson/submit-lesson-feedback.use-case';
import { LessonStatus } from '@/src/domain/entities/lesson.entity';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

/**
 * POST /api/lessons/feedback
 *
 * Submit execution feedback for a lesson.
 *
 * Body:
 * {
 *   lessonId: string,
 *   status: "DELIVERED" | "PARTIALLY_COMPLETED" | "NOT_COMPLETED",
 *   teacherNotes?: string,
 *   actualDuration?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`lesson-feedback:${ip}`, RATE_LIMITS.API_WRITE);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck);
    }

    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      );
    }

    const user = await container.authController.me(accessToken);
    const body = await request.json();

    const { lessonId, status, teacherNotes, actualDuration } = body;

    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'lessonId é obrigatório' } },
        { status: 422 },
      );
    }

    const validStatuses = [LessonStatus.DELIVERED, LessonStatus.PARTIALLY_COMPLETED, LessonStatus.NOT_COMPLETED];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: `status deve ser: ${validStatuses.join(', ')}` } },
        { status: 422 },
      );
    }

    const useCase = new SubmitLessonFeedbackUseCase(container.lessonRepository);

    const updated = await useCase.execute({
      lessonId,
      userId: user.id,
      status,
      teacherNotes,
      actualDuration,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
