import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

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
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Código de 6 dígitos é obrigatório' } },
        { status: 422 },
      );
    }

    await container.authController.confirmPasswordChange(user.id, code);

    return NextResponse.json(
      { success: true, data: { message: 'Palavra-passe alterada com sucesso' } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
