import { Plan, PlanType, PlanStatus } from '@/src/domain/entities/plan.entity';

export interface PaginationParams {
  page?: number;   // 1-based, defaults to 1
  limit?: number;  // defaults to 20
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findByUserId(userId: string, pagination?: PaginationParams): Promise<PaginatedResult<Plan>>;
  findByType(userId: string, type: PlanType, pagination?: PaginationParams): Promise<PaginatedResult<Plan>>;
  findByDosificacaoId(dosificacaoId: string): Promise<Plan[]>;
  create(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan>;
  update(id: string, data: Partial<Plan>): Promise<Plan>;
  updateStatus(id: string, status: PlanStatus): Promise<Plan>;
  delete(id: string): Promise<void>;
  findAll(pagination?: PaginationParams): Promise<PaginatedResult<Plan>>;
  countByUserIdSince(userId: string, since: Date): Promise<number>;
}
