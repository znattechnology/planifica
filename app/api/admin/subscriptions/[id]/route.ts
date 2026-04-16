import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** PATCH /api/admin/subscriptions/:id — activate, expire, or cancel a subscription (admin only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return container.subscriptionController.manageSubscription(request, id);
}
