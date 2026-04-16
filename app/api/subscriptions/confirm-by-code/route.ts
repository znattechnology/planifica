import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** POST /api/subscriptions/confirm-by-code — teacher confirms payment with 4-digit code */
export async function POST(request: NextRequest) {
  return container.subscriptionController.confirmPaymentByCode(request);
}
