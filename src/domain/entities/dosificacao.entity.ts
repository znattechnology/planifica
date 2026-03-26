export interface Dosificacao {
  id: string;
  userId: string;
  title: string;
  subject: string;
  grade: string;
  academicYear: string;
  content: DosificacaoContent;
  createdAt: Date;
  updatedAt: Date;
}

export interface DosificacaoContent {
  regime: string;
  curso: string;
  horasSemanais: number;
  totalHoras: number;
  numAulas: number;
  fundamentacao: string;
  objectivosGerais: string;
  avaliacao: string;
  bibliografia: string;
  unidades: DosificacaoUnidade[];
}

export interface DosificacaoUnidade {
  nome: string;
  topicos: DosificacaoTopico[];
}

export interface DosificacaoTopico {
  objectivosEspecificos: string;
  conteudos: string;
  numAulas: number;
  metodos: string;
  recursos: string;
}
