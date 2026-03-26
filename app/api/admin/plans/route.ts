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

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');

    let usersResult;
    if (user.role === UserRole.COORDINATOR && user.school) {
      usersResult = await container.userRepository.findBySchool(user.school, { page: 1, limit: 1000 });
    } else {
      usersResult = await container.userRepository.findAll({ page: 1, limit: 1000 });
    }
    const users = usersResult.data;
    const userIds = new Set(users.map(u => u.id));
    const userMap = new Map(users.map(u => [u.id, u]));

    const plansResult = await container.planRepository.findAll({ page: 1, limit: 1000 });
    let allPlans = plansResult.data;

    // Filter by coordinator's school teachers
    if (user.role === UserRole.COORDINATOR) {
      allPlans = allPlans.filter(p => userIds.has(p.userId));
    }

    // Apply filters
    if (status) allPlans = allPlans.filter(p => p.status === status);
    if (type) allPlans = allPlans.filter(p => p.type === type);

    const plansWithTeacher = allPlans.map(p => {
      const teacher = userMap.get(p.userId);
      return {
        id: p.id,
        title: p.title,
        type: p.type,
        subject: p.subject,
        grade: p.grade,
        status: p.status,
        academicYear: p.academicYear,
        createdAt: p.createdAt,
        teacher: teacher ? { name: teacher.name, email: teacher.email } : null,
      };
    });

    return NextResponse.json({ success: true, data: plansWithTeacher });
  } catch (err) {
    return handleApiError(err);
  }
}
