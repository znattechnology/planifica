import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** GET /api/subscriptions/usage — returns current month's plan usage vs. subscription limit */
export async function GET(request: NextRequest) {
  return container.subscriptionController.getUsage(request);
}
