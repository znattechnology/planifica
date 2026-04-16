import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/** POST /api/subscriptions/upgrade — initiate PREMIUM upgrade (generates payment reference) */
export async function POST(request: NextRequest) {
  return container.subscriptionController.upgrade(request);
}
