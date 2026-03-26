import { NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

export async function GET(request: Request) {
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
    const academicYear = url.searchParams.get('year');

    if (academicYear) {
      const calendar = await container.getSchoolCalendarUseCase.getByYear(user.id, academicYear);
      return NextResponse.json({ success: true, data: { calendar } });
    }

    const calendars = await container.getSchoolCalendarUseCase.getAll(user.id);
    return NextResponse.json({ success: true, data: { calendars } });
  } catch (err) {
    return handleApiError(err);
  }
}

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

    const { academicYear, schoolName } = body;

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Ano lectivo é obrigatório' } },
        { status: 422 },
      );
    }

    const calendar = await container.createSchoolCalendarUseCase.execute(user.id, {
      academicYear,
      country: 'Angola',
      schoolName,
    });

    return NextResponse.json(
      { success: true, data: { calendar } },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
