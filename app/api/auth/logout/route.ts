import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/src/shared/lib/auth-cookies';

export async function POST() {
  const response = NextResponse.json(
    { success: true, data: { message: 'Sessão terminada com sucesso' } },
    { status: 200 },
  );

  return clearAuthCookies(response);
}
