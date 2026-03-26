import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { profileSchema } from '@/src/application/validators/profile.validator';

export async function PUT(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      );
    }

    const currentUser = await container.authController.me(accessToken);
    const body = await request.json();

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 422 },
      );
    }

    const updatedUser = await container.authController.updateProfile(currentUser.id, parsed.data);

    return NextResponse.json(
      { success: true, data: { user: updatedUser } },
      { status: 200 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
