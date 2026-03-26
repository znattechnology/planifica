import { IDosificacaoRepository } from '@/src/domain/interfaces/repositories/dosificacao.repository';
import { Dosificacao } from '@/src/domain/entities/dosificacao.entity';
import { prisma } from '@/src/infrastructure/database/prisma/client';

export class PrismaDosificacaoRepository implements IDosificacaoRepository {
  async findById(id: string): Promise<Dosificacao | null> {
    const record = await prisma.dosificacao.findUnique({ where: { id } });
    return record as unknown as Dosificacao | null;
  }

  async findByUserId(userId: string): Promise<Dosificacao[]> {
    const records = await prisma.dosificacao.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records as unknown as Dosificacao[];
  }

  async create(data: Omit<Dosificacao, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dosificacao> {
    const record = await prisma.dosificacao.create({ data: data as never });
    return record as unknown as Dosificacao;
  }

  async update(id: string, data: Partial<Dosificacao>): Promise<Dosificacao> {
    const record = await prisma.dosificacao.update({
      where: { id },
      data: data as never,
    });
    return record as unknown as Dosificacao;
  }

  async delete(id: string): Promise<void> {
    await prisma.dosificacao.delete({ where: { id } });
  }
}
