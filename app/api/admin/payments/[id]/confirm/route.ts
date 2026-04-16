import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** POST /api/admin/payments/:id/confirm — manually confirm a PENDING payment (admin only) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return container.subscriptionController.confirmPayment(request, id);
}
