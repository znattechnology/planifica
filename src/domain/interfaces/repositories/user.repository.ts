import { User } from '@/src/domain/entities/user.entity';
import { PaginationParams, PaginatedResult } from './plan.repository';

export type UserWithPassword = User & { password: string };

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  findByIdWithPassword(id: string): Promise<UserWithPassword | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<User>;
  update(id: string, data: Partial<User> & { password?: string }): Promise<User>;
  delete(id: string): Promise<void>;
  findAll(pagination?: PaginationParams): Promise<PaginatedResult<User>>;
  findBySchool(school: string, pagination?: PaginationParams): Promise<PaginatedResult<User>>;
  countByRole(): Promise<Record<string, number>>;
}
