import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { config } from 'dotenv';

config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find the main user to associate data with
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!user) {
    console.log('No users found. Please create a user first.');
    return;
  }
  console.log(`Using user: ${user.name} (${user.email})`);

  // Delete old dosificacoes with legacy content structure
  const existing = await prisma.dosificacao.findMany({ where: { userId: user.id } });
  for (const d of existing) {
    const content = d.content as Record<string, unknown>;
    // Delete if it has old-style themes or no unidades
    if (content?.themes || !content?.unidades) {
      // First delete plans linked to this dosificacao
      await prisma.plan.deleteMany({ where: { dosificacaoId: d.id } });
      await prisma.dosificacao.delete({ where: { id: d.id } });
      console.log(`Deleted old dosificacao: ${d.title}`);
    }
  }

  // ── Seed: Plano Anual - Matemática 10ª Classe ──
  const planoMatematica = await prisma.dosificacao.create({
    data: {
      userId: user.id,
      title: 'Plano de Ensino - Matemática 10ª Classe',
      subject: 'Matemática',
      grade: '10ª Classe',
      academicYear: '2025/2026',
      content: {
        regime: 'Regular',
        curso: 'Ciências Físicas e Biológicas',
        horasSemanais: 4,
        totalHoras: 128,
        numAulas: 64,
        fundamentacao: 'A Matemática é uma disciplina fundamental para o desenvolvimento do raciocínio lógico e abstracto dos alunos. No ensino secundário, a disciplina visa consolidar os conhecimentos adquiridos no ensino básico e preparar os alunos para desafios académicos e profissionais futuros. A abordagem integrada entre teoria e prática permite ao aluno compreender a aplicabilidade da Matemática no quotidiano e nas ciências.',
        objectivosGerais: '• Desenvolver o raciocínio lógico-matemático e a capacidade de resolução de problemas\n• Consolidar conceitos fundamentais de álgebra, geometria e análise\n• Aplicar conhecimentos matemáticos na resolução de problemas do quotidiano\n• Desenvolver a capacidade de comunicação matemática\n• Utilizar ferramentas matemáticas para modelar situações reais',
        avaliacao: 'A avaliação será contínua e sistemática, contemplando:\n• Provas escritas (2 por trimestre) — 40%\n• Trabalhos individuais e em grupo — 20%\n• Participação e exercícios em aula — 20%\n• Prova trimestral — 20%',
        bibliografia: '• Manual de Matemática 10ª Classe — INIDE, Angola\n• Matemática — Exercícios e Problemas, 10ª Classe, Editora Escolar\n• Fundamentos de Matemática Elementar — Gelson Iezzi\n• NCTM Principles and Standards for School Mathematics',
        unidades: [
          {
            nome: 'Unidade I — Lógica e Conjuntos',
            topicos: [
              {
                objectivosEspecificos: 'Compreender os conceitos de proposição, conectivos lógicos e tabelas de verdade',
                conteudos: '1.1. Proposições e valores lógicos\n1.2. Conectivos lógicos (negação, conjunção, disjunção)\n1.3. Tabelas de verdade',
                numAulas: 6,
                metodos: 'Expositivo\nInterrogativo\nResolução de problemas',
                recursos: 'Quadro\nManual\nFichas de exercícios',
              },
              {
                objectivosEspecificos: 'Operar com conjuntos e resolver problemas envolvendo conjuntos numéricos',
                conteudos: '1.4. Operações com conjuntos\n1.5. Conjuntos numéricos (N, Z, Q, R)\n1.6. Intervalos e desigualdades',
                numAulas: 8,
                metodos: 'Expositivo\nDemonstrativo\nTrabalho em grupo',
                recursos: 'Quadro\nManual\nDiagramas de Venn',
              },
            ],
          },
          {
            nome: 'Unidade II — Funções Reais',
            topicos: [
              {
                objectivosEspecificos: 'Definir função e identificar domínio, contradomínio e conjunto de chegada',
                conteudos: '2.1. Conceito de função\n2.2. Domínio e contradomínio\n2.3. Gráfico de uma função',
                numAulas: 6,
                metodos: 'Expositivo\nDemonstrativo\nAnálise gráfica',
                recursos: 'Quadro\nManual\nGráficos\nCalculadora',
              },
              {
                objectivosEspecificos: 'Estudar funções afins e quadráticas, suas propriedades e gráficos',
                conteudos: '2.4. Função afim (y = ax + b)\n2.5. Função quadrática (y = ax² + bx + c)\n2.6. Vértice, eixo de simetria e concavidade',
                numAulas: 10,
                metodos: 'Expositivo\nDemonstrativo\nResolução de problemas\nModelação',
                recursos: 'Quadro\nManual\nPapel quadriculado\nCalculadora',
              },
              {
                objectivosEspecificos: 'Resolver equações e inequações do 2º grau',
                conteudos: '2.7. Equações do 2º grau\n2.8. Fórmula resolvente\n2.9. Inequações do 2º grau',
                numAulas: 8,
                metodos: 'Expositivo\nResolução de exercícios\nTrabalho individual',
                recursos: 'Quadro\nManual\nFichas de exercícios',
              },
            ],
          },
          {
            nome: 'Unidade III — Trigonometria',
            topicos: [
              {
                objectivosEspecificos: 'Compreender as razões trigonométricas no triângulo rectângulo',
                conteudos: '3.1. Seno, cosseno e tangente\n3.2. Relações trigonométricas fundamentais\n3.3. Valores notáveis (30°, 45°, 60°)',
                numAulas: 8,
                metodos: 'Expositivo\nDemonstrativo\nExperimentação',
                recursos: 'Quadro\nTransferidor\nRégua\nManual',
              },
              {
                objectivosEspecificos: 'Resolver triângulos e aplicar a trigonometria a problemas práticos',
                conteudos: '3.4. Resolução de triângulos rectângulos\n3.5. Lei dos senos e lei dos cossenos\n3.6. Aplicações práticas',
                numAulas: 8,
                metodos: 'Resolução de problemas\nTrabalho em grupo\nProjecto prático',
                recursos: 'Manual\nFichas\nInstrumentos de medição',
              },
            ],
          },
          {
            nome: 'Unidade IV — Geometria Analítica',
            topicos: [
              {
                objectivosEspecificos: 'Calcular distâncias e pontos médios no plano cartesiano',
                conteudos: '4.1. Distância entre dois pontos\n4.2. Ponto médio de um segmento\n4.3. Condição de alinhamento',
                numAulas: 6,
                metodos: 'Expositivo\nDemonstrativo\nResolução de exercícios',
                recursos: 'Quadro\nManual\nPapel quadriculado',
              },
              {
                objectivosEspecificos: 'Estudar a equação da recta e resolver problemas de posição relativa',
                conteudos: '4.4. Equação reduzida da recta\n4.5. Equação geral da recta\n4.6. Rectas paralelas e perpendiculares',
                numAulas: 8,
                metodos: 'Expositivo\nAnálise gráfica\nResolução de problemas',
                recursos: 'Quadro\nManual\nGráficos\nRégua',
              },
            ],
          },
        ],
      },
    },
  });
  console.log(`Created: ${planoMatematica.title}`);

  // ── Seed: Plano Anual - Física 10ª Classe ──
  const planoFisica = await prisma.dosificacao.create({
    data: {
      userId: user.id,
      title: 'Plano de Ensino - Física 10ª Classe',
      subject: 'Física',
      grade: '10ª Classe',
      academicYear: '2025/2026',
      content: {
        regime: 'Regular',
        curso: 'Ciências Físicas e Biológicas',
        horasSemanais: 3,
        totalHoras: 96,
        numAulas: 48,
        fundamentacao: 'A Física é a ciência que estuda os fenómenos naturais e as leis que os governam. No contexto do ensino secundário angolano, a disciplina desempenha um papel crucial na formação científica dos alunos, promovendo a compreensão do mundo físico e o desenvolvimento do pensamento crítico e experimental.',
        objectivosGerais: '• Compreender os princípios fundamentais da mecânica, termodinâmica e óptica\n• Desenvolver competências experimentais e de observação científica\n• Aplicar as leis da Física na resolução de problemas práticos\n• Relacionar os conceitos de Física com fenómenos do quotidiano\n• Desenvolver o espírito crítico e a metodologia científica',
        avaliacao: 'Avaliação contínua:\n• Provas escritas — 40%\n• Relatórios de experiências — 15%\n• Trabalhos de pesquisa — 15%\n• Participação e exercícios — 10%\n• Prova trimestral — 20%',
        bibliografia: '• Manual de Física 10ª Classe — INIDE, Angola\n• Fundamentos de Física — Halliday, Resnick & Walker\n• Física — Exercícios Resolvidos, 10ª Classe',
        unidades: [
          {
            nome: 'Unidade I — Grandezas Físicas e Medição',
            topicos: [
              {
                objectivosEspecificos: 'Distinguir grandezas escalares e vectoriais; utilizar o SI de unidades',
                conteudos: '1.1. Grandezas físicas fundamentais e derivadas\n1.2. Sistema Internacional de Unidades\n1.3. Notação científica e algarismos significativos',
                numAulas: 4,
                metodos: 'Expositivo\nExperimental\nDemonstrativo',
                recursos: 'Instrumentos de medição\nManual\nLaboratório',
              },
              {
                objectivosEspecificos: 'Realizar medições com precisão e calcular erros experimentais',
                conteudos: '1.4. Instrumentos de medição\n1.5. Erros de medição\n1.6. Tratamento de dados experimentais',
                numAulas: 4,
                metodos: 'Experimental\nTrabalho prático\nRelatório',
                recursos: 'Régua\nBalança\nCronómetro\nFichas de laboratório',
              },
            ],
          },
          {
            nome: 'Unidade II — Cinemática',
            topicos: [
              {
                objectivosEspecificos: 'Descrever o movimento rectilíneo uniforme e uniformemente variado',
                conteudos: '2.1. Conceitos de posição, deslocamento e trajectória\n2.2. Velocidade média e instantânea\n2.3. Movimento rectilíneo uniforme (MRU)',
                numAulas: 6,
                metodos: 'Expositivo\nDemonstrativo\nResolução de problemas',
                recursos: 'Quadro\nManual\nVídeos didácticos',
              },
              {
                objectivosEspecificos: 'Analisar gráficos de movimento e resolver problemas de cinemática',
                conteudos: '2.4. Aceleração\n2.5. Movimento rectilíneo uniformemente variado (MRUV)\n2.6. Queda livre',
                numAulas: 8,
                metodos: 'Expositivo\nExperimental\nAnálise gráfica',
                recursos: 'Manual\nLaboratório\nCronómetro\nCalculadora',
              },
            ],
          },
          {
            nome: 'Unidade III — Dinâmica',
            topicos: [
              {
                objectivosEspecificos: 'Compreender e aplicar as leis de Newton',
                conteudos: '3.1. Força e massa\n3.2. 1ª Lei de Newton (Inércia)\n3.3. 2ª Lei de Newton (F = ma)\n3.4. 3ª Lei de Newton (Acção-Reacção)',
                numAulas: 8,
                metodos: 'Expositivo\nExperimental\nDemonstrativo',
                recursos: 'Dinamómetros\nCarrinhos\nManual\nLaboratório',
              },
              {
                objectivosEspecificos: 'Resolver problemas envolvendo forças de atrito e planos inclinados',
                conteudos: '3.5. Força de atrito\n3.6. Planos inclinados\n3.7. Aplicações das leis de Newton',
                numAulas: 6,
                metodos: 'Resolução de problemas\nExperimental\nTrabalho em grupo',
                recursos: 'Manual\nFichas\nLaboratório',
              },
            ],
          },
          {
            nome: 'Unidade IV — Trabalho e Energia',
            topicos: [
              {
                objectivosEspecificos: 'Calcular trabalho de uma força e energia cinética e potencial',
                conteudos: '4.1. Trabalho de uma força\n4.2. Energia cinética\n4.3. Energia potencial gravitacional\n4.4. Teorema trabalho-energia',
                numAulas: 6,
                metodos: 'Expositivo\nDemonstrativo\nResolução de exercícios',
                recursos: 'Quadro\nManual\nLaboratório',
              },
              {
                objectivosEspecificos: 'Aplicar o princípio da conservação da energia',
                conteudos: '4.5. Conservação da energia mecânica\n4.6. Potência e rendimento\n4.7. Aplicações práticas',
                numAulas: 6,
                metodos: 'Resolução de problemas\nProjecto prático',
                recursos: 'Manual\nFichas\nCalculadora',
              },
            ],
          },
        ],
      },
    },
  });
  console.log(`Created: ${planoFisica.title}`);

  // ── Seed: Plano Anual - Língua Portuguesa 10ª Classe ──
  const planoPortugues = await prisma.dosificacao.create({
    data: {
      userId: user.id,
      title: 'Plano de Ensino - Língua Portuguesa 10ª Classe',
      subject: 'Língua Portuguesa',
      grade: '10ª Classe',
      academicYear: '2025/2026',
      content: {
        regime: 'Regular',
        curso: 'Ciências Físicas e Biológicas',
        horasSemanais: 5,
        totalHoras: 160,
        numAulas: 80,
        fundamentacao: 'A Língua Portuguesa, enquanto língua oficial de Angola, constitui o principal veículo de comunicação, ensino e integração social. O seu domínio é essencial para o sucesso académico e profissional dos alunos. O ensino da língua no 10º ano visa aprofundar as competências comunicativas e o conhecimento das estruturas linguísticas e literárias.',
        objectivosGerais: '• Aperfeiçoar a comunicação oral e escrita em Língua Portuguesa\n• Desenvolver a compreensão e interpretação de textos de diferentes tipologias\n• Conhecer e aplicar as regras gramaticais da língua\n• Apreciar obras literárias de autores angolanos e lusófonos\n• Produzir textos argumentativos, narrativos e expositivos com coerência',
        avaliacao: '• Provas escritas (compreensão e produção textual) — 30%\n• Oralidade (apresentações e debates) — 15%\n• Trabalhos de leitura e análise literária — 20%\n• Exercícios gramaticais e fichas — 15%\n• Prova trimestral — 20%',
        bibliografia: '• Manual de Língua Portuguesa 10ª Classe — INIDE\n• Gramática de Língua Portuguesa — Celso Cunha e Lindley Cintra\n• Antologia de Poesia Angolana — Viriato da Cruz\n• Luuanda — Luandino Vieira',
        unidades: [
          {
            nome: 'Unidade I — Comunicação e Linguagem',
            topicos: [
              {
                objectivosEspecificos: 'Identificar os elementos do processo comunicativo e as funções da linguagem',
                conteudos: '1.1. Elementos da comunicação\n1.2. Funções da linguagem\n1.3. Linguagem verbal e não verbal',
                numAulas: 8,
                metodos: 'Expositivo\nInterrogativo\nTrabalho em grupo',
                recursos: 'Manual\nTextos\nMeios audiovisuais',
              },
              {
                objectivosEspecificos: 'Distinguir registos de língua e adequar o discurso ao contexto',
                conteudos: '1.4. Registos de língua (formal, informal, coloquial)\n1.5. Variedades do Português (Portugal, Brasil, Angola)\n1.6. Adequação discursiva',
                numAulas: 6,
                metodos: 'Debate\nAnálise de textos\nProdução oral',
                recursos: 'Manual\nTextos autênticos\nÁudios',
              },
            ],
          },
          {
            nome: 'Unidade II — Gramática',
            topicos: [
              {
                objectivosEspecificos: 'Classificar e analisar as classes de palavras e suas funções sintácticas',
                conteudos: '2.1. Classes de palavras (revisão e aprofundamento)\n2.2. Funções sintácticas\n2.3. Análise morfossintáctica',
                numAulas: 10,
                metodos: 'Expositivo\nExercícios práticos\nAnálise de frases',
                recursos: 'Manual\nGramática\nFichas de exercícios',
              },
              {
                objectivosEspecificos: 'Aplicar regras de concordância, regência e pontuação',
                conteudos: '2.4. Concordância verbal e nominal\n2.5. Regência verbal\n2.6. Pontuação e ortografia',
                numAulas: 8,
                metodos: 'Expositivo\nDitado\nProdução de textos',
                recursos: 'Manual\nGramática\nDicionário',
              },
            ],
          },
          {
            nome: 'Unidade III — Tipologias Textuais',
            topicos: [
              {
                objectivosEspecificos: 'Produzir e analisar textos narrativos, descritivos e argumentativos',
                conteudos: '3.1. Texto narrativo (estrutura, personagens, tempo, espaço)\n3.2. Texto descritivo\n3.3. Texto argumentativo (tese, argumentos, conclusão)',
                numAulas: 12,
                metodos: 'Análise de textos\nProdução escrita\nRevisão entre pares',
                recursos: 'Manual\nTextos modelo\nFichas de produção',
              },
              {
                objectivosEspecificos: 'Redigir textos formais: carta, relatório, requerimento',
                conteudos: '3.4. Carta formal e informal\n3.5. Relatório\n3.6. Requerimento e acta',
                numAulas: 8,
                metodos: 'Demonstrativo\nPrática guiada\nSimulação',
                recursos: 'Manual\nModelos de documentos',
              },
            ],
          },
          {
            nome: 'Unidade IV — Literatura Angolana e Lusófona',
            topicos: [
              {
                objectivosEspecificos: 'Analisar obras de autores angolanos e compreender o contexto histórico-literário',
                conteudos: '4.1. Panorama da literatura angolana\n4.2. Análise de contos de Luandino Vieira\n4.3. Poesia de Agostinho Neto e Viriato da Cruz',
                numAulas: 10,
                metodos: 'Leitura dirigida\nAnálise literária\nDebate',
                recursos: 'Obras literárias\nManual\nFichas de leitura',
              },
              {
                objectivosEspecificos: 'Relacionar os textos literários com a realidade social e cultural angolana',
                conteudos: '4.4. Literatura e identidade cultural\n4.5. Intertextualidade\n4.6. Produção de textos criativos',
                numAulas: 8,
                metodos: 'Seminário\nTrabalho de grupo\nProdução criativa',
                recursos: 'Obras literárias\nManual\nMeios audiovisuais',
              },
            ],
          },
        ],
      },
    },
  });
  console.log(`Created: ${planoPortugues.title}`);

  console.log('\nSeed completed successfully!');
  console.log(`Total planos anuais created: 3`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
