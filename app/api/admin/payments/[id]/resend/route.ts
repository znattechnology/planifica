import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** POST /api/admin/payments/:id/resend — resend payment reference email (admin only) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return container.subscriptionController.resendPaymentReference(request, id);
}
