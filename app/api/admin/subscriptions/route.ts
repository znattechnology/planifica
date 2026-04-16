import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** GET /api/admin/subscriptions — list all subscriptions (admin only, supports ?page=&limit=) */
export async function GET(request: NextRequest) {
  return container.subscriptionController.listSubscriptions(request);
}
