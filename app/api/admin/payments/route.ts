import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** GET /api/admin/payments — list all payments (admin only, supports ?page=&limit=) */
export async function GET(request: NextRequest) {
  return container.subscriptionController.listPayments(request);
}
