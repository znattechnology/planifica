import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { changePasswordSchema } from '@/src/application/validators/profile.validator';

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

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 422 },
      );
    }

    // Step 1: validate current password and send verification code
    await container.authController.requestPasswordChange(
      user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    return NextResponse.json(
      { success: true, data: { requiresVerification: true, message: 'Código de verificação enviado para o seu email' } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
