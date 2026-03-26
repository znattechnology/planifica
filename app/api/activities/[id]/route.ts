import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

export async function GET(
  request: NextRequest,
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
    const { id } = await params;
    const activity = await container.teachingActivityRepository.findById(id);

    if (!activity || activity.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Actividade não encontrada' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: activity });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
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
    const { id } = await params;
    const activity = await container.teachingActivityRepository.findById(id);

    if (!activity || activity.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Actividade não encontrada' } },
        { status: 404 },
      );
    }

    const body = await request.json();
    const allowedFields = ['type', 'subject', 'grade', 'topic', 'description', 'date', 'duration', 'studentCount', 'notes', 'outcomes', 'challenges'] as const;
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) sanitized[key] = body[key];
    }
    const updated = await container.teachingActivityRepository.update(id, sanitized);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
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
    const { id } = await params;
    const activity = await container.teachingActivityRepository.findById(id);

    if (!activity || activity.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Actividade não encontrada' } },
        { status: 404 },
      );
    }

    await container.teachingActivityRepository.delete(id);
    return NextResponse.json({ success: true, data: { message: 'Actividade eliminada' } });
  } catch (err) {
    return handleApiError(err);
  }
}
