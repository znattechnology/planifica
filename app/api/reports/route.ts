import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

export async function GET(request: NextRequest) {
  return container.reportController.getReports(request);
}
