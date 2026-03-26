import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { resetPasswordSchema } from '@/src/application/validators/auth.validator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, ...passwordData } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Token de recuperação em falta' } },
        { status: 422 },
      );
    }

    const parsed = resetPasswordSchema.safeParse(passwordData);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 422 },
      );
    }

    await container.authController.resetPassword(token, parsed.data.password);

    return NextResponse.json(
      { success: true, data: { message: 'Palavra-passe redefinida com sucesso' } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
