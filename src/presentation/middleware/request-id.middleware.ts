import { NextRequest, NextResponse } from 'next/server';

export function withRequestId(request: NextRequest, response: NextResponse): NextResponse {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  response.headers.set('x-request-id', requestId);
  return response;
}
