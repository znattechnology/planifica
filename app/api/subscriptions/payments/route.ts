import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** GET /api/subscriptions/payments — returns current user's payment history */
export async function GET(request: NextRequest) {
  return container.subscriptionController.getMyPayments(request);
}
