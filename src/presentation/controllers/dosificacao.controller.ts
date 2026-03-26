import { NextRequest } from 'next/server';
import { AuthService } from '@/src/auth/auth.service';
import { IDosificacaoRepository } from '@/src/domain/interfaces/repositories/dosificacao.repository';
import { validateCreateDosificacao } from '@/src/application/validators/dosificacao.validator';
import { successResponse, handleApiError } from '@/src/shared/lib/api-response';
import { ILogger } from '@/src/domain/interfaces/services/logger.service';

export class DosificacaoController {
  constructor(
    private readonly dosificacaoRepository: IDosificacaoRepository,
    private readonly authService: AuthService,
    private readonly logger: ILogger,
  ) {}

  async getAll(request: NextRequest) {
    try {
      const user = await this.authService.getUserFromRequest(request);
      const dosificacoes = await this.dosificacaoRepository.findByUserId(user.id);
      return successResponse(dosificacoes);
    } catch (error) {
      this.logger.error('Failed to fetch dosificacoes', error as Error);
      return handleApiError(error);
    }
  }

  async create(request: NextRequest) {
    try {
      const user = await this.authService.getUserFromRequest(request);
      const body = await request.json();
      const dto = validateCreateDosificacao(body);

      this.logger.info('Creating dosificacao', { userId: user.id, title: dto.title });

      const dosificacao = await this.dosificacaoRepository.create({
        ...dto,
        userId: user.id,
      });

      return successResponse(dosificacao, 201);
    } catch (error) {
      this.logger.error('Failed to create dosificacao', error as Error);
      return handleApiError(error);
    }
  }
}
