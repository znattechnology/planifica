import { AIClient } from './ai-client'

export interface ParsedPlanoAnual {
  title: string
  subject: string
  grade: string
  academicYear: string
  regime?: string
  curso?: string
  horasSemanais?: number
  totalHoras?: number
  numAulas?: number
  fundamentacao?: string
  objectivosGerais?: string
  avaliacao?: string
  bibliografia?: string
  unidades: {
    nome: string
    topicos: {
      objectivosEspecificos: string
      conteudos: string
      numAulas: number
      metodos: string
      recursos: string
    }[]
  }[]
}

const EXTRACTION_PROMPT = `Tens um documento de um plano de ensino anual (dosificação) de uma escola angolana.
Extrai toda a informação do documento e devolve em formato JSON com a seguinte estrutura exacta:

{
  "title": "título do plano (ex: Plano de Ensino - Matemática 10ª Classe)",
  "subject": "nome da disciplina",
  "grade": "classe (ex: 10ª Classe)",
  "academicYear": "ano lectivo (ex: 2025/2026)",
  "regime": "Regular ou Pós-Laboral (se disponível)",
  "curso": "nome do curso (se disponível)",
  "horasSemanais": numero_horas_semanais,
  "totalHoras": total_horas_anuais,
  "numAulas": numero_total_aulas,
  "fundamentacao": "fundamentação ou justificativa da disciplina (se disponível)",
  "objectivosGerais": "objectivos gerais (se disponível)",
  "avaliacao": "critérios de avaliação (se disponível)",
  "bibliografia": "bibliografia (se disponível)",
  "unidades": [
    {
      "nome": "Unidade I - Nome da Unidade",
      "topicos": [
        {
          "objectivosEspecificos": "objectivos específicos deste tópico",
          "conteudos": "conteúdos programáticos",
          "numAulas": numero_de_aulas,
          "metodos": "métodos ou estratégias de ensino",
          "recursos": "recursos ou meios de ensino"
        }
      ]
    }
  ]
}

REGRAS IMPORTANTES:
- Se um campo não estiver no documento, usa string vazia "" para texto e 0 para números
- Agrupa os conteúdos por unidade temática
- Se o documento usar "temas" em vez de "unidades", trata cada tema como uma unidade
- Mantém a ordem original do documento
- numAulas em cada tópico deve ser um número inteiro
- Se houver uma tabela com colunas (objectivos, conteúdos, aulas, métodos, recursos), mapeia directamente
- O campo "grade" deve incluir "Classe" (ex: "10ª Classe", não apenas "10ª")
- Para a classe, normaliza para o formato "Xª Classe"
- Devolve APENAS o JSON, sem texto adicional`

export class DocumentParserService {
  private aiClient: AIClient

  constructor(aiClient?: AIClient) {
    this.aiClient = aiClient || new AIClient({
      modelConfig: { temperature: 0.1, maxTokens: 8192 },
    })
  }

  async parseDocument(text: string, fileType: string): Promise<ParsedPlanoAnual> {
    const truncated = this.truncateText(text, 30000)

    const response = await this.aiClient.complete({
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        {
          role: 'user',
          content: `Documento (${fileType.toUpperCase()}):\n\n${truncated}`,
        },
      ],
      responseFormat: 'json',
      config: { temperature: 0.1, maxTokens: 8192 },
    })

    const parsed = JSON.parse(response.content)
    return this.normalizeResult(parsed)
  }

  private normalizeResult(raw: Record<string, unknown>): ParsedPlanoAnual {
    const result: ParsedPlanoAnual = {
      title: String(raw.title || ''),
      subject: String(raw.subject || ''),
      grade: String(raw.grade || ''),
      academicYear: String(raw.academicYear || ''),
      regime: raw.regime ? String(raw.regime) : undefined,
      curso: raw.curso ? String(raw.curso) : undefined,
      horasSemanais: Number(raw.horasSemanais) || undefined,
      totalHoras: Number(raw.totalHoras) || undefined,
      numAulas: Number(raw.numAulas) || undefined,
      fundamentacao: raw.fundamentacao ? String(raw.fundamentacao) : undefined,
      objectivosGerais: raw.objectivosGerais ? String(raw.objectivosGerais) : undefined,
      avaliacao: raw.avaliacao ? String(raw.avaliacao) : undefined,
      bibliografia: raw.bibliografia ? String(raw.bibliografia) : undefined,
      unidades: [],
    }

    const rawUnidades = Array.isArray(raw.unidades) ? raw.unidades : []
    result.unidades = rawUnidades.map((u: Record<string, unknown>, i: number) => ({
      nome: String(u.nome || `Unidade ${i + 1}`),
      topicos: Array.isArray(u.topicos)
        ? u.topicos.map((t: Record<string, unknown>) => ({
            objectivosEspecificos: String(t.objectivosEspecificos || ''),
            conteudos: String(t.conteudos || ''),
            numAulas: Number(t.numAulas) || 0,
            metodos: String(t.metodos || ''),
            recursos: String(t.recursos || ''),
          }))
        : [{ objectivosEspecificos: '', conteudos: '', numAulas: 0, metodos: '', recursos: '' }],
    }))

    // Ensure at least one unidade
    if (result.unidades.length === 0) {
      result.unidades = [{
        nome: 'Unidade I',
        topicos: [{ objectivosEspecificos: '', conteudos: '', numAulas: 0, metodos: '', recursos: '' }],
      }]
    }

    return result
  }

  private truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text
    return text.slice(0, maxChars) + '\n\n[... documento truncado por exceder o limite ...]'
  }
}
