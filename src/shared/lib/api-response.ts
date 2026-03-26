import { NextResponse } from 'next/server';
import { ApiResponse, ApiError } from '@/src/shared/types/api.types';

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: ApiError, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status });
}

export function handleApiError(err: unknown): NextResponse<ApiResponse> {
  if (err instanceof Error) {
    if (err.name === 'EntityNotFoundError') {
      return errorResponse({ code: 'NOT_FOUND', message: err.message }, 404);
    }
    if (err.name === 'ValidationError') {
      return errorResponse({ code: 'VALIDATION_ERROR', message: err.message }, 422);
    }
    if (err.name === 'UnauthorizedError') {
      return errorResponse({ code: 'UNAUTHORIZED', message: err.message }, 401);
    }
  }

  console.error('Unhandled API error:', err);
  return errorResponse({ code: 'INTERNAL_ERROR', message: 'Internal server error' }, 500);
}
