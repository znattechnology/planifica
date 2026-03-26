import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel,
  ShadingType, VerticalAlign, TableLayoutType,
} from 'docx'
import { saveAs } from 'file-saver'

type PlanType = 'ANNUAL' | 'TRIMESTER' | 'BIWEEKLY' | 'LESSON'

interface LessonPhaseData {
  name: string
  duration: string
  activities: string[]
  content?: string
  methods?: string
  resources?: string
  assessment?: string
}

interface PlanForExport {
  title: string
  type?: PlanType
  subject?: string
  grade?: string
  academicYear?: string
  trimester?: number
  status?: string
  content?: {
    generalObjectives?: string[]
    specificObjectives?: string[]
    objectives?: string[]
    competencies?: string[]
    topics?: { title: string; subtopics?: string[]; duration?: string; week?: number }[]
    methodology?: string | Record<string, unknown>
    resources?: string[]
    assessment?: string | Record<string, unknown>
    observations?: string
    topic?: string
    duration?: number
    lessonType?: string
    lessonNumber?: number
    didacticUnit?: string
    summary?: string
    lessonPhases?: LessonPhaseData[]
    homework?: string
    bibliography?: string[]
    criticalNotes?: string
    weeklyPlan?: { week: string; period?: string; unit: string; objectives: string; contents: string; numLessons: number }[]
    totalWeeks?: number
    totalLessons?: number
  }
  createdAt?: string
  teacher?: {
    name: string
    school?: string
  }
}

const TYPE_LABELS: Record<PlanType, string> = {
  ANNUAL: 'Plano Anual',
  TRIMESTER: 'Dosificação Trimestral',
  BIWEEKLY: 'Dosificação Quinzenal',
  LESSON: 'Plano de Aula',
}

const YELLOW_SHADING = { type: ShadingType.SOLID, color: 'FFF3B0' }
const LIGHT_GRAY_SHADING = { type: ShadingType.SOLID, color: 'F5F5F5' }

const THIN_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
}

function formatFieldText(value: string | Record<string, unknown> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n')
}

function textCell(text: string, opts?: { bold?: boolean; shading?: Record<string, unknown>; colSpan?: number; width?: number }): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: text || '—', bold: opts?.bold, size: 18, font: 'Arial' })],
    })],
    shading: opts?.shading,
    columnSpan: opts?.colSpan,
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: THIN_BORDER,
    verticalAlign: VerticalAlign.TOP,
  })
}

function multiLineCell(lines: string[], opts?: { bold?: boolean; shading?: Record<string, unknown>; colSpan?: number }): TableCell {
  return new TableCell({
    children: lines.map(line => new Paragraph({
      children: [new TextRun({ text: line, bold: opts?.bold, size: 18, font: 'Arial' })],
    })),
    shading: opts?.shading,
    columnSpan: opts?.colSpan,
    borders: THIN_BORDER,
    verticalAlign: VerticalAlign.TOP,
  })
}

// ════════════════════════════════════════════════════════════════
// LESSON PLAN — MOD.06.DEM.01
// ════════════════════════════════════════════════════════════════
function buildLessonPlanDoc(plan: PlanForExport): Document {
  const c = plan.content || {}
  const generalObjs = c.generalObjectives || c.objectives || []
  const specificObjs = c.specificObjectives || []

  function findPhase(keyword: string): LessonPhaseData | undefined {
    return c.lessonPhases?.find(p => p.name.toLowerCase().includes(keyword.toLowerCase()))
  }

  const inicio = findPhase('início') || findPhase('inicio') || findPhase('motivação') || findPhase('introdução')
  const desenvolvimento = findPhase('desenvolvimento')
  const conclusao = findPhase('conclusão') || findPhase('conclusao') || findPhase('verificação') || findPhase('síntese')
  const tpc = findPhase('tarefa') || findPhase('tpc') || findPhase('orientação')

  const summaryText = c.summary || c.topics?.map((t, i) => `${i + 1}. ${t.title}`).join('\n') || '—'

  return new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: 'landscape' } },
        },
        children: [
          // Header
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  textCell('PLANO DE AULA', { bold: true, shading: YELLOW_SHADING, width: 70 }),
                  textCell('MOD.06.DEM.01', { bold: true, shading: YELLOW_SHADING, width: 30 }),
                ],
              }),
              // Info line 1
              new TableRow({
                children: [
                  textCell(`Nome do Professor: ${plan.teacher?.name || '________'}  /Curso: ${plan.grade || '___'}  /Classe: ${plan.grade || '___'}  /Turma: ___  /Data: ___/___/${plan.academicYear || '____'}`, { colSpan: 2 }),
                ],
              }),
              // Info line 2
              new TableRow({
                children: [
                  textCell(`Disciplina: ${plan.subject || '___'}  - Aula Nº: ${c.lessonNumber || '___'}  / Tipo de aula: ${c.lessonType || 'Teórico-Prática'}`, { colSpan: 2 }),
                ],
              }),
              // Unidade Didáctica
              new TableRow({
                children: [
                  textCell(`Unidade Didáctica: ${c.didacticUnit || c.topic || '—'}`, { colSpan: 2 }),
                ],
              }),
            ],
          }),

          // Sumário
          new Paragraph({ spacing: { before: 100 } }),
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  multiLineCell(['Sumário:', ...summaryText.split('\n')], { bold: false }),
                ],
              }),
            ],
          }),

          // Objectivos
          new Paragraph({ spacing: { before: 100 } }),
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  multiLineCell(['Objectivo Geral:', ...generalObjs.map(o => `• ${o}`)]),
                ],
              }),
              new TableRow({
                children: [
                  multiLineCell(['Objectivos Específicos:', ...specificObjs.map(o => `• ${o}`)]),
                ],
              }),
            ],
          }),

          // Stages table
          new Paragraph({ spacing: { before: 200 } }),
          new Paragraph({ children: [new TextRun({ text: '' })] }),
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header
              new TableRow({
                children: [
                  textCell('ETAPAS DA AULA', { bold: true, shading: YELLOW_SHADING }),
                  textCell('CONTEÚDO', { bold: true, shading: YELLOW_SHADING }),
                  textCell('ACTIVIDADES', { bold: true, shading: YELLOW_SHADING }),
                  textCell('MÉTODOS / ESTRATÉGIAS', { bold: true, shading: YELLOW_SHADING }),
                  textCell('RECURSOS DIDÁCTICOS', { bold: true, shading: YELLOW_SHADING }),
                  textCell('AVALIAÇÃO', { bold: true, shading: YELLOW_SHADING }),
                  textCell('TEMPO', { bold: true, shading: YELLOW_SHADING }),
                ],
              }),
              // Início
              new TableRow({
                children: [
                  multiLineCell(['Início', '(Motivação)'], { bold: true, shading: LIGHT_GRAY_SHADING }),
                  multiLineCell((inicio?.content || 'Saudar os estudantes\nControlar as presenças\nMotivação').split('\n')),
                  multiLineCell(inicio?.activities || ['—']),
                  textCell(inicio?.methods || 'Expositivo\nInterrogativo'),
                  textCell(inicio?.resources || (c.resources || []).slice(0, 3).join('\n') || 'Quadro\nGiz'),
                  textCell(inicio?.assessment || 'Oral'),
                  textCell(inicio?.duration || '5 min'),
                ],
              }),
              // Desenvolvimento
              new TableRow({
                children: [
                  textCell('Desenvolvimento', { bold: true, shading: LIGHT_GRAY_SHADING }),
                  multiLineCell((desenvolvimento?.content || c.topics?.map(t => t.title).join('\n') || '—').split('\n')),
                  multiLineCell(desenvolvimento?.activities || ['—']),
                  textCell(desenvolvimento?.methods || formatFieldText(c.methodology) || 'Expositivo\nInterrogativo'),
                  textCell(desenvolvimento?.resources || (c.resources || []).join('\n') || '—'),
                  textCell(desenvolvimento?.assessment || 'Oral\nEscrita'),
                  textCell(desenvolvimento?.duration || '25 min'),
                ],
              }),
              // Conclusão
              new TableRow({
                children: [
                  multiLineCell(['Conclusão', '(Verificação e Síntese)'], { bold: true, shading: LIGHT_GRAY_SHADING }),
                  textCell(conclusao?.content || 'Resumo do conteúdo abordado'),
                  multiLineCell((conclusao?.activities || ['Esclarecer dúvidas', 'Síntese da aula'])),
                  textCell(conclusao?.methods || 'Expositivo'),
                  textCell(conclusao?.resources || 'Quadro'),
                  textCell(conclusao?.assessment || 'Oral'),
                  textCell(conclusao?.duration || '10 min'),
                ],
              }),
              // TPC
              new TableRow({
                children: [
                  multiLineCell(['Orientação da Tarefa', '(TPC)'], { bold: true, shading: LIGHT_GRAY_SHADING }),
                  textCell(tpc?.content || c.homework || '—', { colSpan: 5 }),
                  textCell(tpc?.duration || '5 min'),
                ],
              }),
              // Bibliografia
              new TableRow({
                children: [
                  textCell('Bibliografia', { bold: true, shading: LIGHT_GRAY_SHADING }),
                  multiLineCell(c.bibliography?.map((b, i) => `${i + 1}. ${b}`) || ['—'], { colSpan: 6 }),
                ],
              }),
              // Notas Críticas
              new TableRow({
                children: [
                  multiLineCell(['Notas Críticas', '(opcional)'], { bold: true, shading: LIGHT_GRAY_SHADING }),
                  textCell(c.criticalNotes || c.observations || '', { colSpan: 6 }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  })
}

// ════════════════════════════════════════════════════════════════
// DOSIFICAÇÃO — MOD.20.DEM.00 (Anual) / MOD.10.DEM.00 (Trimestral)
// Shared function for both ANNUAL and TRIMESTER
// ════════════════════════════════════════════════════════════════
function buildDosificacaoDoc(plan: PlanForExport): Document {
  const isAnnual = plan.type === 'ANNUAL'
  const title = isAnnual ? 'DOSIFICAÇÃO ANUAL' : 'DOSIFICAÇÃO TRIMESTRAL'
  const modCode = isAnnual ? 'MOD.20.DEM.00' : 'MOD.10.DEM.00'
  const totalLabel = isAnnual ? 'Total de Aulas / Ano Lectivo:' : 'Total de Aulas por Semana / Trimestre:'

  const c = plan.content || {}
  const weeklyPlan = c.weeklyPlan || []
  const totalLessons = c.totalLessons || weeklyPlan.reduce((sum, w) => sum + w.numLessons, 0) || (c.topics || []).length * 2

  const infoLine = isAnnual
    ? `Classe: ${plan.grade || '—'}  |  Ano Lectivo: ${plan.academicYear || '—'}`
    : `Classe: ${plan.grade || '—'}  |  Ano Lectivo: ${plan.academicYear || '—'}  |  Trimestre: ${plan.trimester || 1}º`

  const weekRows = weeklyPlan.length > 0
    ? weeklyPlan.map(w => new TableRow({
        children: [
          textCell(w.week),
          textCell(w.period || ''),
          textCell(w.unit),
          multiLineCell(w.objectives.split('\n')),
          multiLineCell(w.contents.split('\n')),
          textCell(String(w.numLessons)),
        ],
      }))
    : (c.topics || []).map((topic, i) => new TableRow({
        children: [
          textCell(`${i + 1}ª`),
          textCell(''),
          textCell(['I', 'II', 'III', 'IV', 'V', 'VI'][Math.floor(i / 3)] || 'I'),
          textCell((c.specificObjectives || c.generalObjectives || c.objectives || [])[i] || '—'),
          multiLineCell([topic.title, ...(topic.subtopics || [])]),
          textCell('2'),
        ],
      }))

  return new Document({
    sections: [{
      properties: {
        page: { size: { orientation: 'landscape' } },
      },
      children: [
        // Header
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                textCell(title, { bold: true, shading: YELLOW_SHADING, width: 70 }),
                textCell(modCode, { bold: true, shading: YELLOW_SHADING, width: 30 }),
              ],
            }),
            new TableRow({
              children: [textCell(`Disciplina: ${plan.subject || '—'}`, { colSpan: 2 })],
            }),
            new TableRow({
              children: [textCell(infoLine, { colSpan: 2 })],
            }),
            new TableRow({
              children: [textCell(`Professor: ${plan.teacher?.name || '________________________'}`, { colSpan: 2 })],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 200 } }),

        // Weekly table
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Header
            new TableRow({
              children: [
                textCell('Semana Lectiva', { bold: true, shading: YELLOW_SHADING }),
                textCell('Período', { bold: true, shading: YELLOW_SHADING }),
                textCell('Unidade Didáctica', { bold: true, shading: YELLOW_SHADING }),
                textCell('Objectivos', { bold: true, shading: YELLOW_SHADING }),
                textCell('Conteúdos', { bold: true, shading: YELLOW_SHADING }),
                textCell('Nº de Aulas', { bold: true, shading: YELLOW_SHADING }),
              ],
            }),
            ...weekRows,
            // Total
            new TableRow({
              children: [
                textCell(totalLabel, { bold: true, colSpan: 5 }),
                textCell(String(totalLessons), { bold: true }),
              ],
            }),
          ],
        }),

        // Methodology
        ...(c.methodology ? [
          new Paragraph({ spacing: { before: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Metodologia:', bold: true, size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            children: [new TextRun({ text: formatFieldText(c.methodology), size: 18, font: 'Arial' })],
          }),
        ] : []),

        // Assessment
        ...(c.assessment ? [
          new Paragraph({ spacing: { before: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Avaliação:', bold: true, size: 20, font: 'Arial' })],
          }),
          new Paragraph({
            children: [new TextRun({ text: formatFieldText(c.assessment), size: 18, font: 'Arial' })],
          }),
        ] : []),
      ],
    }],
  })
}

// ════════════════════════════════════════════════════════════════
// BIWEEKLY PLAN — MOD.47.DEM.00
// ════════════════════════════════════════════════════════════════
function buildBiweeklyPlanDoc(plan: PlanForExport): Document {
  const c = plan.content || {}
  const topics = c.topics || []
  const generalObjs = c.generalObjectives || c.objectives || []

  const topicRows = topics.length > 0
    ? topics.map((topic, i) => {
        const specificObj = (c.specificObjectives || [])[i] || ''
        return new TableRow({
          children: [
            textCell(String(topic.week || i + 1)),
            multiLineCell([topic.title, ...(topic.subtopics?.map(s => `• ${s}`) || [])]),
            textCell(specificObj),
            textCell(formatFieldText(c.methodology) || ''),
            textCell((c.competencies || [])[i] || (c.competencies || []).join('\n') || ''),
            textCell(formatFieldText(c.assessment) || ''),
          ],
        })
      })
    : [new TableRow({
        children: [
          textCell(' '), textCell(' '), textCell(' '), textCell(' '), textCell(' '), textCell(' '),
        ],
      })]

  return new Document({
    sections: [{
      properties: {
        page: { size: { orientation: 'landscape' } },
      },
      children: [
        // Header
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'PLANO QUINZENAL', bold: true, size: 28, font: 'Arial' })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: 'MOD.47.DEM.00', size: 16, font: 'Arial' })],
                    }),
                  ],
                  borders: THIN_BORDER,
                  columnSpan: 2,
                }),
              ],
            }),
            new TableRow({
              children: [textCell(`PLANIFICAÇÃO REFERENTE A: ${plan.title || ''}`, { colSpan: 2 })],
            }),
            new TableRow({
              children: [textCell(`ANO LECTIVO: ${plan.academicYear || ''}`, { colSpan: 2 })],
            }),
            new TableRow({
              children: [textCell(`Professor: ${plan.teacher?.name || '________________________'}`, { colSpan: 2 })],
            }),
            new TableRow({
              children: [textCell(`Disciplina: ${plan.subject || '—'}  /Curso(s): ${plan.grade || '—'}  /Classe(s): ${plan.grade || '—'}`, { colSpan: 2 })],
            }),
            new TableRow({
              children: [textCell(`Unidade Didáctica: ${topics.length > 0 ? topics[0].title : ''}`, { colSpan: 2 })],
            }),
            new TableRow({
              children: [textCell(`Objectivo Geral: ${generalObjs.join('; ') || ''}`, { colSpan: 2 })],
            }),
          ],
        }),

        new Paragraph({ spacing: { before: 200 } }),

        // Content table
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                textCell('AULA', { bold: true, shading: LIGHT_GRAY_SHADING }),
                textCell('CONTEÚDO PROGRAMÁTICO', { bold: true, shading: LIGHT_GRAY_SHADING }),
                textCell('OBJECTIVOS ESPECÍFICOS', { bold: true, shading: LIGHT_GRAY_SHADING }),
                textCell('ESTRATÉGIAS DE ENSINO', { bold: true, shading: LIGHT_GRAY_SHADING }),
                textCell('EXPECTATIVAS DE APRENDIZAGEM', { bold: true, shading: LIGHT_GRAY_SHADING }),
                textCell('AVALIAÇÃO/ INSTRUMENTOS', { bold: true, shading: LIGHT_GRAY_SHADING }),
              ],
            }),
            ...topicRows,
          ],
        }),

        new Paragraph({ spacing: { before: 200 } }),

        // Signatures
        new Paragraph({
          children: [
            new TextRun({ text: `O Professor: ${plan.teacher?.name || '________________________'}`, size: 18, font: 'Arial' }),
            new TextRun({ text: '          ', size: 18 }),
            new TextRun({ text: 'O Coordenador de Curso/Disciplina: ________________________', size: 18, font: 'Arial' }),
            new TextRun({ text: '          ', size: 18 }),
            new TextRun({ text: 'Data: ___/___/20__', size: 18, font: 'Arial' }),
          ],
        }),
      ],
    }],
  })
}

// ════════════════════════════════════════════════════════════════
// GENERIC PLAN (Annual)
// ════════════════════════════════════════════════════════════════
function buildGenericPlanDoc(plan: PlanForExport): Document {
  const c = plan.content || {}
  const sections: Paragraph[] = []

  // Title
  sections.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: plan.title, bold: true, size: 28, font: 'Arial' })],
  }))

  // Meta
  const metaLines = [
    plan.type ? `Tipo: ${TYPE_LABELS[plan.type]}` : '',
    plan.subject ? `Disciplina: ${plan.subject}` : '',
    plan.grade ? `Classe: ${plan.grade}` : '',
    plan.academicYear ? `Ano Lectivo: ${plan.academicYear}` : '',
    plan.trimester ? `Trimestre: ${plan.trimester}º` : '',
  ].filter(Boolean)

  for (const line of metaLines) {
    sections.push(new Paragraph({
      children: [new TextRun({ text: line, size: 20, font: 'Arial' })],
    }))
  }

  sections.push(new Paragraph({ spacing: { before: 200 } }))

  // Objectives
  const generalObjs = c.generalObjectives || []
  const specificObjs = c.specificObjectives || []
  const legacyObjs = c.objectives || []

  function addObjectiveSection(title: string, items: string[]) {
    if (!items.length) return
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: title, bold: true, size: 24, font: 'Arial' })],
    }))
    for (const obj of items) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `• ${obj}`, size: 20, font: 'Arial' })],
      }))
    }
    sections.push(new Paragraph({ spacing: { before: 100 } }))
  }

  addObjectiveSection('Objectivos Gerais', generalObjs)
  addObjectiveSection('Objectivos Específicos', specificObjs)
  if (!generalObjs.length && !specificObjs.length) addObjectiveSection('Objectivos', legacyObjs)

  // Competencies
  if (c.competencies?.length) {
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Competências', bold: true, size: 24, font: 'Arial' })],
    }))
    for (const comp of c.competencies) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `• ${comp}`, size: 20, font: 'Arial' })],
      }))
    }
    sections.push(new Paragraph({ spacing: { before: 100 } }))
  }

  // Topics
  if (c.topics?.length) {
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Temas / Conteúdos', bold: true, size: 24, font: 'Arial' })],
    }))
    for (const topic of c.topics) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: topic.title, bold: true, size: 20, font: 'Arial' })],
      }))
      if (topic.subtopics) {
        for (const sub of topic.subtopics) {
          sections.push(new Paragraph({
            children: [new TextRun({ text: `   • ${sub}`, size: 18, font: 'Arial' })],
          }))
        }
      }
    }
    sections.push(new Paragraph({ spacing: { before: 100 } }))
  }

  // Methodology
  if (c.methodology) {
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Metodologia', bold: true, size: 24, font: 'Arial' })],
    }))
    sections.push(new Paragraph({
      children: [new TextRun({ text: formatFieldText(c.methodology), size: 20, font: 'Arial' })],
    }))
    sections.push(new Paragraph({ spacing: { before: 100 } }))
  }

  // Resources
  if (c.resources?.length) {
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Recursos', bold: true, size: 24, font: 'Arial' })],
    }))
    sections.push(new Paragraph({
      children: [new TextRun({ text: c.resources.join('  •  '), size: 20, font: 'Arial' })],
    }))
    sections.push(new Paragraph({ spacing: { before: 100 } }))
  }

  // Assessment
  if (c.assessment) {
    sections.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: 'Avaliação', bold: true, size: 24, font: 'Arial' })],
    }))
    sections.push(new Paragraph({
      children: [new TextRun({ text: formatFieldText(c.assessment), size: 20, font: 'Arial' })],
    }))
  }

  return new Document({
    sections: [{ children: sections }],
  })
}

// ════════════════════════════════════════════════════════════════
// Main export
// ════════════════════════════════════════════════════════════════
export async function exportPlanToWord(plan: PlanForExport): Promise<void> {
  let doc: Document

  if (plan.type === 'LESSON') {
    doc = buildLessonPlanDoc(plan)
  } else if (plan.type === 'TRIMESTER' || plan.type === 'ANNUAL') {
    doc = buildDosificacaoDoc(plan)
  } else if (plan.type === 'BIWEEKLY') {
    doc = buildBiweeklyPlanDoc(plan)
  } else {
    doc = buildGenericPlanDoc(plan)
  }

  const blob = await Packer.toBlob(doc)
  const filename = `${plan.title.replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_')}.docx`
  saveAs(blob, filename)
}
