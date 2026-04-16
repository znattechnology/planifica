import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** GET /api/subscriptions — returns current user's subscription status and any pending payment */
export async function GET(request: NextRequest) {
  return container.subscriptionController.getStatus(request);
}
