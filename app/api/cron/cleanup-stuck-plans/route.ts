import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cron endpoint: marks plans stuck in GENERATING for more than 5 minutes as DRAFT.
 *
 * Should be called periodically (e.g., every 2 minutes via Vercel Cron or external scheduler).
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prisma = new PrismaClient();
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

    // Find plans stuck in GENERATING state past the threshold
    const stuckPlans = await prisma.plan.findMany({
      where: {
        status: 'GENERATING',
        OR: [
          // Plans with generatingStartedAt before cutoff
          { generatingStartedAt: { lt: cutoff } },
          // Legacy plans without generatingStartedAt that were created before cutoff
          {
            generatingStartedAt: null,
            createdAt: { lt: cutoff },
          },
        ],
      },
      select: { id: true, title: true, createdAt: true, generatingStartedAt: true },
    });

    if (stuckPlans.length === 0) {
      await prisma.$disconnect();
      return NextResponse.json({ cleaned: 0, message: 'No stuck plans found' });
    }

    // Mark them as DRAFT with an error note
    const result = await prisma.plan.updateMany({
      where: {
        id: { in: stuckPlans.map(p => p.id) },
        status: 'GENERATING',
      },
      data: {
        status: 'DRAFT',
        content: {
          generalObjectives: [],
          specificObjectives: [],
          competencies: [],
          topics: [],
          criticalNotes: 'A geração deste plano excedeu o tempo limite (5 minutos). Isto pode acontecer devido a instabilidade na ligação ou sobrecarga do serviço de IA. Por favor, tente gerar novamente.',
        },
      },
    });

    await prisma.$disconnect();

    return NextResponse.json({
      cleaned: result.count,
      planIds: stuckPlans.map(p => p.id),
      message: `${result.count} plano(s) preso(s) em GENERATING foram recuperados.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
