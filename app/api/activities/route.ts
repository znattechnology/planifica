import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { ActivityType } from '@/src/domain/entities/teaching-activity.entity';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

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
    const subject = url.searchParams.get('subject');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let activities;
    if (subject && startDate && endDate) {
      activities = await container.teachingActivityRepository.findBySubjectAndPeriod(
        user.id,
        subject,
        new Date(startDate),
        new Date(endDate),
      );
    } else if (startDate && endDate) {
      activities = await container.teachingActivityRepository.findByPeriod(
        user.id,
        new Date(startDate),
        new Date(endDate),
      );
    } else {
      activities = await container.teachingActivityRepository.findByUserId(user.id);
    }

    return NextResponse.json({ success: true, data: activities });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`activity-create:${ip}`, RATE_LIMITS.API_WRITE);
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

    const { type, subject, grade, topic, description, date, duration, studentCount, notes, outcomes, challenges, planId, lessonId } = body;

    if (!type || !subject || !grade || !topic || !description || !date || !duration) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Campos obrigatórios: type, subject, grade, topic, description, date, duration' } },
        { status: 422 },
      );
    }

    if (!Object.values(ActivityType).includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Tipo de actividade inválido' } },
        { status: 422 },
      );
    }

    const activity = await container.teachingActivityRepository.create({
      userId: user.id,
      type,
      subject,
      grade,
      topic,
      description,
      date: new Date(date),
      duration: Number(duration),
      studentCount: studentCount ? Number(studentCount) : undefined,
      notes: notes || undefined,
      outcomes: outcomes || undefined,
      challenges: challenges || undefined,
      planId: planId || undefined,
      lessonId: lessonId || undefined,
    });

    return NextResponse.json({ success: true, data: activity }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
