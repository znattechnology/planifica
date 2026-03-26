import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/src/main/container';
import { handleApiError } from '@/src/shared/lib/api-response';
import { getAccessToken } from '@/src/shared/lib/auth-cookies';
import { UserRole } from '@/src/domain/entities/user.entity';

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      );
    }

    const user = await container.authController.me(accessToken);
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.COORDINATOR) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Acesso negado' } },
        { status: 403 },
      );
    }

    // Get all users (filtered by school for coordinators)
    let usersResult;
    if (user.role === UserRole.COORDINATOR && user.school) {
      usersResult = await container.userRepository.findBySchool(user.school, { page: 1, limit: 1000 });
    } else {
      usersResult = await container.userRepository.findAll({ page: 1, limit: 1000 });
    }
    const users = usersResult.data;

    // Get all plans
    const plansResult = await container.planRepository.findAll({ page: 1, limit: 1000 });
    const allPlans = plansResult.data;
    const relevantPlans = user.role === UserRole.COORDINATOR
      ? allPlans.filter(p => users.some(u => u.id === p.userId))
      : allPlans;

    // Calculate stats
    const roleCounts = await container.userRepository.countByRole();
    const plansByStatus: Record<string, number> = {};
    const plansByType: Record<string, number> = {};
    for (const plan of relevantPlans) {
      plansByStatus[plan.status] = (plansByStatus[plan.status] || 0) + 1;
      plansByType[plan.type] = (plansByType[plan.type] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: users.length,
        roleCounts,
        totalPlans: relevantPlans.length,
        plansByStatus,
        plansByType,
        recentPlans: relevantPlans.slice(0, 10).map(p => ({
          id: p.id,
          title: p.title,
          type: p.type,
          subject: p.subject,
          grade: p.grade,
          status: p.status,
          userId: p.userId,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
