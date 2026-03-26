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

    const planoAnual = await container.dosificacaoRepository.findById(id);
    if (!planoAnual || planoAnual.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Plano anual não encontrado' } },
        { status: 404 },
      );
    }

    // Include teacher info from user profile
    const teacherProfile = await container.teacherProfileRepository.findByUserId(user.id);
    const dataWithTeacher = {
      ...planoAnual,
      teacher: {
        name: user.name,
        school: teacherProfile?.schoolName || user.school || '',
      },
    };

    return NextResponse.json({ success: true, data: dataWithTeacher });
  } catch (err) {
    return handleApiError(err);
  }
}
