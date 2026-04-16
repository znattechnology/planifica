import { NextRequest } from 'next/server';
import { container } from '@/src/main/container';

/**
 * POST /api/cron/expire-subscriptions
 *
 * Intended to be called by Vercel Cron (or any external scheduler) once daily.
 * Requires the `x-cron-secret` header to match the CRON_SECRET environment variable.
 *
 * Vercel Cron configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-subscriptions",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  return container.subscriptionController.runExpireCron(request);
}
