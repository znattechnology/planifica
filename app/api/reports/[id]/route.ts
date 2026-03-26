import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return container.reportController.getReport(request, id);
}
