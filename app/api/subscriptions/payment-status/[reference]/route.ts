import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/**
 * GET /api/subscriptions/payment-status/:reference
 *
 * Polls the current status of a pending payment by its Multicaixa reference.
 * Authenticated — user must be logged in (they don't need to own the payment,
 * but the reference is opaque enough to prevent enumeration attacks).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  return container.subscriptionController.getPaymentStatus(request, reference);
}
