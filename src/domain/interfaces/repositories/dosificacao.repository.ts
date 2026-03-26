import { Dosificacao } from '@/src/domain/entities/dosificacao.entity';

export interface IDosificacaoRepository {
  findById(id: string): Promise<Dosificacao | null>;
  findByUserId(userId: string): Promise<Dosificacao[]>;
  create(data: Omit<Dosificacao, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dosificacao>;
  update(id: string, data: Partial<Dosificacao>): Promise<Dosificacao>;
  delete(id: string): Promise<void>;
}
