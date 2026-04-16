import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

export async function GET(request: NextRequest) {
  return container.subscriptionPlanConfigController.listPlanConfigs(request);
}

export async function POST(request: NextRequest) {
  return container.subscriptionPlanConfigController.createPlanConfig(request);
}
