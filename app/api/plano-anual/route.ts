import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit';

export async function GET(request: NextRequest) {
  return container.dosificacaoController.getAll(request);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(`plano-anual-create:${ip}`, RATE_LIMITS.API_WRITE);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck);
  }
  return container.dosificacaoController.create(request);
}

export async function PATCH(request: NextRequest) {
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ID é obrigatório' } },
        { status: 422 },
      );
    }

    const planoAnual = await container.dosificacaoRepository.findById(id);
    if (!planoAnual || planoAnual.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Plano anual não encontrado' } },
        { status: 404 },
      );
    }

    const allowedFields = ['title', 'subject', 'grade', 'academicYear', 'content', 'status'] as const;
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updateData) sanitized[key] = updateData[key];
    }
    const updated = await container.dosificacaoRepository.update(id, sanitized);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'ID é obrigatório' } },
        { status: 422 },
      );
    }

    const planoAnual = await container.dosificacaoRepository.findById(id);
    if (!planoAnual || planoAnual.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Plano anual não encontrado' } },
        { status: 404 },
      );
    }

    await container.dosificacaoRepository.delete(id);
    return NextResponse.json({ success: true, data: { message: 'Plano anual eliminado' } });
  } catch (err) {
    return handleApiError(err);
  }
}
