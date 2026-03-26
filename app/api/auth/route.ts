import { NextResponse } from 'next/server';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';

export async function GET(request: Request) {
  const accessToken = getAccessToken(request);
  return NextResponse.json({
    success: true,
    data: { authenticated: !!accessToken },
  });
}
