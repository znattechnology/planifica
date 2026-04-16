import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return container.subscriptionPlanConfigController.updatePlanConfig(request, id);
}
