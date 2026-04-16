import { prisma } from '@/src/infrastructure/database/prisma/client';
import { User } from '@/src/domain/entities/user.entity';
import { IUserRepository, UserWithPassword } from '@/src/domain/interfaces/repositories/user.repository';
import { PaginationParams, PaginatedResult } from '@/src/domain/interfaces/repositories/plan.repository';

const userSelectWithoutPassword = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  onboardingCompleted: true,
  role: true,
  school: true,
  subject: true,
  selectedCalendarId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelectWithoutPassword,
    });
    return user as User | null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: userSelectWithoutPassword,
    });
    return user as User | null;
  }

  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user as UserWithPassword | null;
  }

  async findByIdWithPassword(id: string): Promise<UserWithPassword | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user as UserWithPassword | null;
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<User> {
    const user = await prisma.user.create({
      data,
      select: userSelectWithoutPassword,
    });
    return user as User;
  }

  async update(id: string, data: Partial<User> & { password?: string }): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelectWithoutPassword,
    });
    return user as User;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async findAll(pagination?: PaginationParams): Promise<PaginatedResult<User>> {
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({ select: userSelectWithoutPassword, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.user.count(),
    ]);
    return { data: users as User[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySchool(school: string, pagination?: PaginationParams): Promise<PaginatedResult<User>> {
    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit || 20));
    const skip = (page - 1) * limit;
    const where = { school };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: userSelectWithoutPassword, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.user.count({ where }),
    ]);
    return { data: users as User[], total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async countByRole(): Promise<Record<string, number>> {
    const counts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.role] = c._count.id;
    }
    return result;
  }
}
