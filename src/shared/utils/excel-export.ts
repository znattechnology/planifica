import ExcelJS from 'exceljs'
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

const YELLOW_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF3B0' },
}

const LIGHT_GRAY_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5F5F5' },
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, size: 11, name: 'Arial' }
const BODY_FONT: Partial<ExcelJS.Font> = { size: 10, name: 'Arial' }

function formatFieldText(value: string | Record<string, unknown> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n')
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = ws.getRow(rowNum)
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i)
    cell.fill = YELLOW_FILL
    cell.font = HEADER_FONT
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  }
}

function styleBodyRow(ws: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = ws.getRow(rowNum)
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i)
    cell.font = BODY_FONT
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'top', wrapText: true }
  }
}

// ════════════════════════════════════════════════════════════════
// LESSON PLAN
// ════════════════════════════════════════════════════════════════
function buildLessonPlanSheet(wb: ExcelJS.Workbook, plan: PlanForExport) {
  const ws = wb.addWorksheet('Plano de Aula')
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

  // Column widths
  ws.columns = [
    { width: 18 }, { width: 25 }, { width: 25 }, { width: 20 }, { width: 20 }, { width: 12 }, { width: 10 },
  ]

  let row = 1

  // Header
  ws.mergeCells(row, 1, row, 7)
  const titleCell = ws.getCell(row, 1)
  titleCell.value = 'PLANO DE AULA — MOD.06.DEM.01'
  titleCell.fill = YELLOW_FILL
  titleCell.font = { bold: true, size: 14, name: 'Arial' }
  titleCell.border = THIN_BORDER
  titleCell.alignment = { horizontal: 'center' }
  row++

  // Info rows
  const infoRows = [
    `Nome do Professor: ${plan.teacher?.name || '________'}  |  Curso: ${plan.grade || '___'}  |  Classe: ${plan.grade || '___'}  |  Turma: ___  |  Data: ___/___/${plan.academicYear || '____'}`,
    `Disciplina: ${plan.subject || '___'}  |  Aula Nº: ${c.lessonNumber || '___'}  |  Tipo de aula: ${c.lessonType || 'Teórico-Prática'}`,
    `Unidade Didáctica: ${c.didacticUnit || c.topic || '—'}`,
    `Sumário: ${c.summary || c.topics?.map((t, i) => `${i + 1}. ${t.title}`).join('; ') || '—'}`,
    `Objectivo Geral: ${generalObjs.map(o => `• ${o}`).join('; ') || '—'}`,
    `Objectivos Específicos: ${specificObjs.map(o => `• ${o}`).join('; ') || '—'}`,
  ]
  for (const info of infoRows) {
    ws.mergeCells(row, 1, row, 7)
    const cell = ws.getCell(row, 1)
    cell.value = info
    cell.font = BODY_FONT
    cell.border = THIN_BORDER
    cell.alignment = { wrapText: true }
    row++
  }

  row++ // spacer

  // Stages table header
  const headers = ['ETAPAS DA AULA', 'CONTEÚDO', 'ACTIVIDADES', 'MÉTODOS / ESTRATÉGIAS', 'RECURSOS DIDÁCTICOS', 'AVALIAÇÃO', 'TEMPO']
  ws.getRow(row).values = headers
  styleHeaderRow(ws, row, 7)
  row++

  // Stages data
  const stages = [
    ['Início (Motivação)', inicio?.content || 'Saudar os estudantes\nControlar as presenças', inicio?.activities?.join('\n') || '—', inicio?.methods || 'Expositivo\nInterrogativo', inicio?.resources || (c.resources || []).slice(0, 3).join('\n') || 'Quadro\nGiz', inicio?.assessment || 'Oral', inicio?.duration || '5 min'],
    ['Desenvolvimento', desenvolvimento?.content || c.topics?.map(t => t.title).join('\n') || '—', desenvolvimento?.activities?.join('\n') || '—', desenvolvimento?.methods || formatFieldText(c.methodology) || 'Expositivo', desenvolvimento?.resources || (c.resources || []).join('\n') || '—', desenvolvimento?.assessment || 'Oral\nEscrita', desenvolvimento?.duration || '25 min'],
    ['Conclusão (Verificação e Síntese)', conclusao?.content || 'Resumo do conteúdo', conclusao?.activities?.join('\n') || 'Esclarecer dúvidas\nSíntese', conclusao?.methods || 'Expositivo', conclusao?.resources || 'Quadro', conclusao?.assessment || 'Oral', conclusao?.duration || '10 min'],
    ['Orientação da Tarefa (TPC)', tpc?.content || c.homework || '—', '', '', '', '', tpc?.duration || '5 min'],
  ]

  for (const stage of stages) {
    ws.getRow(row).values = stage
    styleBodyRow(ws, row, 7)
    ws.getCell(row, 1).fill = LIGHT_GRAY_FILL
    ws.getCell(row, 1).font = { ...BODY_FONT, bold: true }
    row++
  }

  row++ // spacer

  // Bibliografia
  ws.mergeCells(row, 1, row, 7)
  ws.getCell(row, 1).value = `Bibliografia: ${c.bibliography?.map((b, i) => `${i + 1}. ${b}`).join('; ') || '—'}`
  ws.getCell(row, 1).font = BODY_FONT
  ws.getCell(row, 1).border = THIN_BORDER
  ws.getCell(row, 1).alignment = { wrapText: true }
  row++

  // Notas Críticas
  ws.mergeCells(row, 1, row, 7)
  ws.getCell(row, 1).value = `Notas Críticas: ${c.criticalNotes || c.observations || ''}`
  ws.getCell(row, 1).font = BODY_FONT
  ws.getCell(row, 1).border = THIN_BORDER
  ws.getCell(row, 1).alignment = { wrapText: true }
}

// ════════════════════════════════════════════════════════════════
// DOSIFICAÇÃO — MOD.20.DEM.00 (Anual) / MOD.10.DEM.00 (Trimestral)
// Shared function for both ANNUAL and TRIMESTER
// ════════════════════════════════════════════════════════════════
function buildDosificacaoSheet(wb: ExcelJS.Workbook, plan: PlanForExport) {
  const isAnnual = plan.type === 'ANNUAL'
  const sheetName = isAnnual ? 'Dosificação Anual' : 'Dosificação Trimestral'
  const title = isAnnual ? 'DOSIFICAÇÃO ANUAL — MOD.20.DEM.00' : 'DOSIFICAÇÃO TRIMESTRAL — MOD.10.DEM.00'
  const totalLabel = isAnnual ? 'Total de Aulas / Ano Lectivo:' : 'Total de Aulas por Semana / Trimestre:'

  const ws = wb.addWorksheet(sheetName)
  const c = plan.content || {}
  const weeklyPlan = c.weeklyPlan || []
  const totalLessons = c.totalLessons || weeklyPlan.reduce((sum, w) => sum + w.numLessons, 0) || (c.topics || []).length * 2

  ws.columns = [
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 40 }, { width: 40 }, { width: 12 },
  ]

  let row = 1

  // Header
  ws.mergeCells(row, 1, row, 6)
  const titleCell = ws.getCell(row, 1)
  titleCell.value = title
  titleCell.fill = YELLOW_FILL
  titleCell.font = { bold: true, size: 14, name: 'Arial' }
  titleCell.border = THIN_BORDER
  titleCell.alignment = { horizontal: 'center' }
  row++

  // Info
  const infos = [
    `Disciplina: ${plan.subject || '—'}`,
    isAnnual
      ? `Classe: ${plan.grade || '—'}  |  Ano Lectivo: ${plan.academicYear || '—'}`
      : `Classe: ${plan.grade || '—'}  |  Ano Lectivo: ${plan.academicYear || '—'}  |  Trimestre: ${plan.trimester || 1}º`,
    `Professor: ${plan.teacher?.name || '________________________'}`,
  ]
  for (const info of infos) {
    ws.mergeCells(row, 1, row, 6)
    const cell = ws.getCell(row, 1)
    cell.value = info
    cell.font = BODY_FONT
    cell.border = THIN_BORDER
    row++
  }

  row++ // spacer

  // Table header
  ws.getRow(row).values = ['Semana Lectiva', 'Período', 'Unidade Didáctica', 'Objectivos', 'Conteúdos', 'Nº de Aulas']
  styleHeaderRow(ws, row, 6)
  row++

  // Weekly data
  const weeks = weeklyPlan.length > 0
    ? weeklyPlan.map(w => [w.week, w.period || '', w.unit, w.objectives, w.contents, w.numLessons])
    : (c.topics || []).map((topic, i) => [
        `${i + 1}ª`, '',
        ['I', 'II', 'III', 'IV', 'V', 'VI'][Math.floor(i / 3)] || 'I',
        (c.specificObjectives || c.generalObjectives || c.objectives || [])[i] || '—',
        topic.title + (topic.subtopics?.length ? '\n' + topic.subtopics.join('\n') : ''),
        2,
      ])

  for (const week of weeks) {
    ws.getRow(row).values = week
    styleBodyRow(ws, row, 6)
    row++
  }

  // Total row
  ws.mergeCells(row, 1, row, 5)
  ws.getCell(row, 1).value = totalLabel
  ws.getCell(row, 1).font = { ...BODY_FONT, bold: true }
  ws.getCell(row, 1).border = THIN_BORDER
  ws.getCell(row, 1).alignment = { horizontal: 'right' }
  ws.getCell(row, 6).value = totalLessons
  ws.getCell(row, 6).font = { ...BODY_FONT, bold: true }
  ws.getCell(row, 6).border = THIN_BORDER
  ws.getCell(row, 6).alignment = { horizontal: 'center' }
  row += 2

  // Methodology
  if (c.methodology) {
    ws.mergeCells(row, 1, row, 6)
    ws.getCell(row, 1).value = `Metodologia: ${formatFieldText(c.methodology)}`
    ws.getCell(row, 1).font = BODY_FONT
    ws.getCell(row, 1).alignment = { wrapText: true }
    row++
  }

  // Assessment
  if (c.assessment) {
    ws.mergeCells(row, 1, row, 6)
    ws.getCell(row, 1).value = `Avaliação: ${formatFieldText(c.assessment)}`
    ws.getCell(row, 1).font = BODY_FONT
    ws.getCell(row, 1).alignment = { wrapText: true }
  }
}

// ════════════════════════════════════════════════════════════════
// BIWEEKLY PLAN — MOD.47.DEM.00
// ════════════════════════════════════════════════════════════════
function buildBiweeklyPlanSheet(wb: ExcelJS.Workbook, plan: PlanForExport) {
  const ws = wb.addWorksheet('Dosificação Quinzenal')
  const c = plan.content || {}
  const topics = c.topics || []
  const generalObjs = c.generalObjectives || c.objectives || []

  ws.columns = [
    { width: 8 },   // AULA
    { width: 30 },  // CONTEÚDO PROGRAMÁTICO
    { width: 28 },  // OBJECTIVOS ESPECÍFICOS
    { width: 25 },  // ESTRATÉGIAS DE ENSINO
    { width: 28 },  // EXPECTATIVAS DE APRENDIZAGEM
    { width: 22 },  // AVALIAÇÃO/INSTRUMENTOS
  ]

  let row = 1

  // Header
  ws.mergeCells(row, 1, row, 6)
  const titleCell = ws.getCell(row, 1)
  titleCell.value = 'PLANO QUINZENAL — MOD.47.DEM.00'
  titleCell.font = { bold: true, size: 14, name: 'Arial' }
  titleCell.border = THIN_BORDER
  titleCell.alignment = { horizontal: 'center' }
  row++

  // Form fields
  const formFields = [
    `PLANIFICAÇÃO REFERENTE A: ${plan.title || ''}`,
    `ANO LECTIVO: ${plan.academicYear || ''}`,
    `Professor: ${plan.teacher?.name || '________________________'}`,
    `Disciplina: ${plan.subject || '—'}  /Curso(s): ${plan.grade || '—'}  /Classe(s): ${plan.grade || '—'}`,
    `Unidade Didáctica: ${topics.length > 0 ? topics[0].title : ''}`,
    `Objectivo Geral: ${generalObjs.join('; ') || ''}`,
  ]
  for (const field of formFields) {
    ws.mergeCells(row, 1, row, 6)
    const cell = ws.getCell(row, 1)
    cell.value = field
    cell.font = BODY_FONT
    cell.border = THIN_BORDER
    cell.alignment = { wrapText: true }
    row++
  }

  row++ // spacer

  // Table header
  ws.getRow(row).values = ['AULA', 'CONTEÚDO PROGRAMÁTICO', 'OBJECTIVOS ESPECÍFICOS', 'ESTRATÉGIAS DE ENSINO', 'EXPECTATIVAS DE APRENDIZAGEM', 'AVALIAÇÃO/ INSTRUMENTOS']
  styleHeaderRow(ws, row, 6)
  row++

  // Table data
  if (topics.length > 0) {
    for (const [i, topic] of topics.entries()) {
      const specificObj = (c.specificObjectives || [])[i] || ''
      ws.getRow(row).values = [
        topic.week || i + 1,
        topic.title + (topic.subtopics?.length ? '\n' + topic.subtopics.map(s => `• ${s}`).join('\n') : ''),
        specificObj,
        formatFieldText(c.methodology) || '',
        (c.competencies || [])[i] || (c.competencies || []).join('\n') || '',
        formatFieldText(c.assessment) || '',
      ]
      styleBodyRow(ws, row, 6)
      row++
    }
  } else {
    ws.getRow(row).values = [' ', ' ', ' ', ' ', ' ', ' ']
    styleBodyRow(ws, row, 6)
    row++
  }

  row += 2 // spacer

  // Signatures
  ws.mergeCells(row, 1, row, 6)
  ws.getCell(row, 1).value = `O Professor: ${plan.teacher?.name || '________________________'}          O Coordenador de Curso/Disciplina: ________________________          Data: ___/___/20__`
  ws.getCell(row, 1).font = BODY_FONT
  ws.getCell(row, 1).alignment = { wrapText: true }
}

// ════════════════════════════════════════════════════════════════
// GENERIC PLAN (Annual)
// ════════════════════════════════════════════════════════════════
function buildGenericPlanSheet(wb: ExcelJS.Workbook, plan: PlanForExport) {
  const ws = wb.addWorksheet(plan.type ? TYPE_LABELS[plan.type] : 'Plano')
  const c = plan.content || {}

  ws.columns = [{ width: 8 }, { width: 70 }]

  let row = 1

  // Title
  ws.mergeCells(row, 1, row, 2)
  ws.getCell(row, 1).value = plan.title
  ws.getCell(row, 1).font = { bold: true, size: 16, name: 'Arial' }
  ws.getCell(row, 1).alignment = { horizontal: 'center' }
  row += 2

  // Meta
  const meta = [
    ['Tipo', plan.type ? TYPE_LABELS[plan.type] : ''],
    ['Disciplina', plan.subject || ''],
    ['Classe', plan.grade || ''],
    ['Ano Lectivo', plan.academicYear || ''],
  ]
  for (const [label, value] of meta) {
    ws.getCell(row, 1).value = label
    ws.getCell(row, 1).font = { ...BODY_FONT, bold: true }
    ws.getCell(row, 2).value = value
    ws.getCell(row, 2).font = BODY_FONT
    row++
  }
  row++

  function addSection(title: string, items: string[]) {
    if (!items.length) return
    ws.mergeCells(row, 1, row, 2)
    ws.getCell(row, 1).value = title
    ws.getCell(row, 1).font = HEADER_FONT
    ws.getCell(row, 1).fill = YELLOW_FILL
    ws.getCell(row, 1).border = THIN_BORDER
    row++
    for (const [i, item] of items.entries()) {
      ws.getCell(row, 1).value = i + 1
      ws.getCell(row, 1).font = BODY_FONT
      ws.getCell(row, 1).alignment = { horizontal: 'center' }
      ws.getCell(row, 2).value = item
      ws.getCell(row, 2).font = BODY_FONT
      ws.getCell(row, 2).alignment = { wrapText: true }
      row++
    }
    row++
  }

  const generalObjs = c.generalObjectives || []
  const specificObjs = c.specificObjectives || []
  addSection('Objectivos Gerais', generalObjs)
  addSection('Objectivos Específicos', specificObjs)
  if (!generalObjs.length && !specificObjs.length) addSection('Objectivos', c.objectives || [])
  addSection('Competências', c.competencies || [])

  // Topics
  if (c.topics?.length) {
    ws.mergeCells(row, 1, row, 2)
    ws.getCell(row, 1).value = 'Temas / Conteúdos'
    ws.getCell(row, 1).font = HEADER_FONT
    ws.getCell(row, 1).fill = YELLOW_FILL
    ws.getCell(row, 1).border = THIN_BORDER
    row++
    for (const topic of c.topics) {
      ws.getCell(row, 1).value = '•'
      ws.getCell(row, 1).alignment = { horizontal: 'center' }
      ws.getCell(row, 2).value = topic.title
      ws.getCell(row, 2).font = { ...BODY_FONT, bold: true }
      row++
      if (topic.subtopics) {
        for (const sub of topic.subtopics) {
          ws.getCell(row, 2).value = `   - ${sub}`
          ws.getCell(row, 2).font = BODY_FONT
          row++
        }
      }
    }
    row++
  }

  // Methodology, Resources, Assessment
  if (c.methodology) {
    ws.mergeCells(row, 1, row, 2)
    ws.getCell(row, 1).value = `Metodologia: ${formatFieldText(c.methodology)}`
    ws.getCell(row, 1).font = BODY_FONT
    ws.getCell(row, 1).alignment = { wrapText: true }
    row++
  }
  if (c.resources?.length) {
    ws.mergeCells(row, 1, row, 2)
    ws.getCell(row, 1).value = `Recursos: ${c.resources.join('  •  ')}`
    ws.getCell(row, 1).font = BODY_FONT
    ws.getCell(row, 1).alignment = { wrapText: true }
    row++
  }
  if (c.assessment) {
    ws.mergeCells(row, 1, row, 2)
    ws.getCell(row, 1).value = `Avaliação: ${formatFieldText(c.assessment)}`
    ws.getCell(row, 1).font = BODY_FONT
    ws.getCell(row, 1).alignment = { wrapText: true }
  }
}

// ════════════════════════════════════════════════════════════════
// Main export
// ════════════════════════════════════════════════════════════════
export async function exportPlanToExcel(plan: PlanForExport): Promise<void> {
  const wb = new ExcelJS.Workbook()

  if (plan.type === 'LESSON') {
    buildLessonPlanSheet(wb, plan)
  } else if (plan.type === 'TRIMESTER' || plan.type === 'ANNUAL') {
    buildDosificacaoSheet(wb, plan)
  } else if (plan.type === 'BIWEEKLY') {
    buildBiweeklyPlanSheet(wb, plan)
  } else {
    buildGenericPlanSheet(wb, plan)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `${plan.title.replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_')}.xlsx`
  saveAs(blob, filename)
}
