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

    let usersResult;
    if (user.role === UserRole.COORDINATOR && user.school) {
      usersResult = await container.userRepository.findBySchool(user.school, { page: 1, limit: 1000 });
    } else {
      usersResult = await container.userRepository.findAll({ page: 1, limit: 1000 });
    }
    const users = usersResult.data;

    // Get plan counts per user
    const plansResult = await container.planRepository.findAll({ page: 1, limit: 1000 });
    const planCountMap: Record<string, { total: number; approved: number; generated: number }> = {};
    for (const plan of plansResult.data) {
      if (!planCountMap[plan.userId]) {
        planCountMap[plan.userId] = { total: 0, approved: 0, generated: 0 };
      }
      planCountMap[plan.userId].total++;
      if (plan.status === 'APPROVED') planCountMap[plan.userId].approved++;
      if (plan.status === 'GENERATED') planCountMap[plan.userId].generated++;
    }

    const teachersData = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      school: u.school,
      subject: u.subject,
      createdAt: u.createdAt,
      plans: planCountMap[u.id] || { total: 0, approved: 0, generated: 0 },
    }));

    return NextResponse.json({ success: true, data: teachersData });
  } catch (err) {
    return handleApiError(err);
  }
}
