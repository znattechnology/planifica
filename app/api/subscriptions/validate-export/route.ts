import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';

/**
 * POST /api/subscriptions/validate-export
 *
 * Backend gate for all client-side export actions (PDF, DOCX, Excel).
 * The frontend MUST call this endpoint before triggering any export.
 * FREE users receive 403; PREMIUM users receive 200 with { allowed: true }.
 *
 * This provides server-side enforcement independent of client-side state.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await container.authService.getUserFromRequest(request);
    // Throws ForbiddenError (→ 403) for FREE users, returns void for PREMIUM
    await container.subscriptionAccessMiddleware.check(user.id, 'export');
    return successResponse({ allowed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
