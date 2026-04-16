import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/infrastructure/database/prisma/client';

const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

    const stuckPlans = await prisma.plan.findMany({
      where: {
        status: 'GENERATING',
        OR: [
          { generatingStartedAt: { lt: cutoff } },
          {
            generatingStartedAt: null,
            createdAt: { lt: cutoff },
          },
        ],
      },
      select: { id: true, title: true, createdAt: true, generatingStartedAt: true },
    });

    if (stuckPlans.length === 0) {
      return NextResponse.json({ cleaned: 0, message: 'No stuck plans found' });
    }

    const result = await prisma.plan.updateMany({
      where: {
        id: { in: stuckPlans.map((p: { id: string }) => p.id) },
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
