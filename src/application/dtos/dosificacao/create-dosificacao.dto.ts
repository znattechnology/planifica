import { DosificacaoContent } from '@/src/domain/entities/dosificacao.entity';

export interface CreateDosificacaoDTO {
  title: string;
  subject: string;
  grade: string;
  academicYear: string;
  content: DosificacaoContent;
}
