import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { LessonStatus } from '@/src/domain/entities/lesson.entity';

export interface TimelineWeek {
  week: string;
  period?: string;
  unit: string;
  objectives: string;
  contents: string;
  numLessons: number;
  status: 'completed' | 'partial' | 'pending' | 'skipped';
  lessonCount: { total: number; delivered: number; partial: number; skipped: number };
}

export interface TimelineData {
  planId: string;
  planTitle: string;
  trimester?: number;
  totalWeeks: number;
  completedWeeks: number;
  progressPercent: number;
  weeks: TimelineWeek[];
}

/**
 * GET /api/plans/timeline?planId=xxx
 *
 * Returns structured weekly timeline data for a plan,
 * enriched with lesson execution status.
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
    const planId = url.searchParams.get('planId');

    if (!planId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'planId é obrigatório' } },
        { status: 422 },
      );
    }

    const plan = await container.planRepository.findById(planId);
    if (!plan || plan.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Plano não encontrado' } },
        { status: 404 },
      );
    }

    const weeklyPlan = plan.content.weeklyPlan || [];
    if (weeklyPlan.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          planId: plan.id,
          planTitle: plan.title,
          trimester: plan.trimester,
          totalWeeks: 0,
          completedWeeks: 0,
          progressPercent: 0,
          weeks: [],
        } as TimelineData,
      });
    }

    // Fetch all lessons for this plan to determine per-week status
    const lessons = await container.lessonRepository.findByPlanId(planId);

    // Build timeline weeks
    const weeks: TimelineWeek[] = weeklyPlan.map((w) => {
      // Match lessons to this week by topic or week label
      const weekLessons = lessons.filter(l => {
        const topicMatch = w.contents.toLowerCase().includes(l.topic.toLowerCase())
          || l.topic.toLowerCase().includes(w.contents.toLowerCase().slice(0, 20));
        const weekMatch = l.title.includes(w.week);
        return topicMatch || weekMatch;
      });

      const delivered = weekLessons.filter(l => l.status === LessonStatus.DELIVERED).length;
      const partial = weekLessons.filter(l => l.status === LessonStatus.PARTIALLY_COMPLETED).length;
      const skipped = weekLessons.filter(l => l.status === LessonStatus.NOT_COMPLETED).length;
      const total = weekLessons.length;

      let status: TimelineWeek['status'] = 'pending';
      if (total > 0) {
        if (delivered === total) {
          status = 'completed';
        } else if (skipped === total) {
          status = 'skipped';
        } else if (delivered > 0 || partial > 0) {
          status = 'partial';
        }
      }

      return {
        week: w.week,
        period: w.period,
        unit: w.unit,
        objectives: w.objectives,
        contents: w.contents,
        numLessons: w.numLessons,
        status,
        lessonCount: { total, delivered, partial, skipped },
      };
    });

    const completedWeeks = weeks.filter(w => w.status === 'completed').length;
    const progressPercent = Math.round((completedWeeks / weeks.length) * 100);

    const data: TimelineData = {
      planId: plan.id,
      planTitle: plan.title,
      trimester: plan.trimester,
      totalWeeks: weeks.length,
      completedWeeks,
      progressPercent,
      weeks,
    };

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return handleApiError(err);
  }
}
