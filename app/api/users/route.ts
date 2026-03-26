import { successResponse } from '@/src/shared/lib/api-response';

export async function GET() {
  // TODO: Get current user profile
  return successResponse({ user: null });
}
