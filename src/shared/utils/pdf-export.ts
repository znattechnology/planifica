import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type PlanType = 'ANNUAL' | 'TRIMESTER' | 'BIWEEKLY' | 'LESSON'

interface LessonPhaseForPDF {
  name: string
  duration: string
  activities: string[]
  content?: string
  methods?: string
  resources?: string
  assessment?: string
}

interface PlanForPDF {
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
    lessonPhases?: LessonPhaseForPDF[]
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
  TRIMESTER: 'Plano Trimestral',
  BIWEEKLY: 'Dosificação Quinzenal',
  LESSON: 'Plano de Aula',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  GENERATING: 'A gerar',
  GENERATED: 'Gerado',
  REVIEWED: 'Revisto',
  APPROVED: 'Aprovado',
}

const ACCENT_COLOR: [number, number, number] = [99, 102, 241]

function getLastY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

function getTotalPages(doc: jsPDF): number {
  return (doc as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1
}

function formatFieldText(value: string | Record<string, unknown> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n')
}

// ════════════════════════════════════════════════════════════════
// LESSON PLAN PDF — MOD.06.DEM.01 format (landscape)
// ════════════════════════════════════════════════════════════════
function exportLessonPlanPDF(plan: PlanForPDF): void {
  const doc = new jsPDF('l', 'mm', 'a4') // landscape
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const m = 10 // margin
  const cw = pageWidth - m * 2 // content width
  let y = m

  const c = plan.content || {}
  const generalObjs = c.generalObjectives || c.objectives || []
  const specificObjs = c.specificObjectives || []

  function findPhase(keyword: string): LessonPhaseForPDF | undefined {
    return c.lessonPhases?.find(p => p.name.toLowerCase().includes(keyword.toLowerCase()))
  }

  const inicio = findPhase('início') || findPhase('inicio') || findPhase('motivação') || findPhase('introdução')
  const desenvolvimento = findPhase('desenvolvimento')
  const conclusao = findPhase('conclusão') || findPhase('conclusao') || findPhase('verificação') || findPhase('síntese')
  const tpc = findPhase('tarefa') || findPhase('tpc') || findPhase('orientação')

  // ── Helper: page header ──
  function pageHeader() {
    doc.setFillColor(255, 243, 176)
    doc.rect(m, y, cw, 10, 'F')
    doc.setDrawColor(0)
    doc.rect(m, y, cw, 10)
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('PLANO DE AULA', m + 4, y + 7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('MOD.06.DEM.01', pageWidth - m - 4, y + 7, { align: 'right' })
    y += 10
  }

  // ── Helper: field row ──
  function fieldRow(label: string, value: string, bold = false) {
    doc.setDrawColor(0)
    doc.rect(m, y, cw, 8)
    doc.setTextColor(0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label, m + 2, y + 5.5)
    const labelW = doc.getTextWidth(label) + 3
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(value, m + 2 + labelW, y + 5.5)
    y += 8
  }

  // ── Helper: multi-line field ──
  function multiLineField(label: string, content: string, minH = 15) {
    doc.setDrawColor(0)
    doc.setTextColor(0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')

    const lines = doc.splitTextToSize(content || '—', cw - 6)
    const textH = lines.length * 4.5
    const h = Math.max(minH, textH + 10)

    doc.rect(m, y, cw, h)
    doc.text(label, m + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    let ty = y + 10
    for (const line of lines) {
      doc.text(line, m + 4, ty)
      ty += 4.5
    }
    y += h
  }

  // ═══════ PAGE 1: Header + Info + Objectives ═══════
  pageHeader()

  // Info line 1
  const infoLine1 = `Nome do Professor: ${plan.teacher?.name || '________________________'}  /Curso: ${plan.grade || '___'}  /Classe: ${plan.grade || '___'}  /Turma: ___  /Data: ___/___/${plan.academicYear || '____'}`
  fieldRow('', infoLine1)

  // Info line 2
  const infoLine2 = `Disciplina: ${plan.subject || '___'}  - Aula Nº: ${c.lessonNumber || '___'}  / Hora: ___:___ às ___:___  / Tipo de aula: ${c.lessonType || 'Teórico-Prática'}`
  fieldRow('', infoLine2)

  // Unidade Didáctica
  fieldRow('Unidade Didáctica: ', c.didacticUnit || c.topic || '—')

  // Sumário
  const summaryText = c.summary || c.topics?.map((t, i) => `${i + 1}. ${t.title}`).join('\n') || '—'
  multiLineField('Sumário:', summaryText, 20)

  // Objectivo Geral
  const generalText = generalObjs.map(o => `• ${o}`).join('\n') || '—'
  multiLineField('Objectivo Geral:', generalText, 15)

  // Objectivos Específicos
  const specificText = specificObjs.length > 0
    ? specificObjs.map(o => `• ${o}`).join('\n')
    : '—'
  multiLineField('Objectivos Específicos:', specificText, 15)

  // ── Column widths for stages table (must sum exactly to cw) ──
  const stgCol0 = 28   // Etapas
  const stgCol6 = 22   // Tempo
  const stgRemaining = cw - stgCol0 - stgCol6
  const stgCol1 = stgRemaining * 0.24  // Conteúdo
  const stgCol2 = stgRemaining * 0.22  // Actividades
  const stgCol3 = stgRemaining * 0.20  // Métodos
  const stgCol4 = stgRemaining * 0.18  // Recursos
  const stgCol5 = stgRemaining * 0.16  // Avaliação

  const stagesColumnStyles = {
    0: { cellWidth: stgCol0 },
    1: { cellWidth: stgCol1 },
    2: { cellWidth: stgCol2 },
    3: { cellWidth: stgCol3 },
    4: { cellWidth: stgCol4 },
    5: { cellWidth: stgCol5 },
    6: { cellWidth: stgCol6, halign: 'center' as const },
  }

  // ═══════ PAGE 2: Stages table (Início + Desenvolvimento) ═══════
  doc.addPage('a4', 'l')
  y = m
  pageHeader()

  autoTable(doc, {
    startY: y,
    head: [['ETAPAS DA AULA', 'CONTEÚDO', 'ACTIVIDADES', 'MÉTODOS / ESTRATÉGIAS', 'RECURSOS DIDÁCTICOS', 'AVALIAÇÃO', 'TEMPO']],
    body: [
      [
        { content: 'Início\n(Motivação)', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        inicio?.content || 'Saudar os estudantes\nControlar as presenças\nMotivação\nAnunciar o sumário',
        inicio?.activities?.join('\n') || '—',
        inicio?.methods || 'Expositivo\nInterrogativo',
        inicio?.resources || (c.resources || []).slice(0, 3).join('\n') || 'Quadro\nGiz',
        inicio?.assessment || 'Oral',
        inicio?.duration || '5 min',
      ],
      [
        { content: 'Desenvolvimento', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        desenvolvimento?.content || c.topics?.map(t => t.title).join('\n') || '—',
        desenvolvimento?.activities?.join('\n') || '—',
        desenvolvimento?.methods || formatFieldText(c.methodology) || 'Expositivo\nInterrogativo\nDemonstrativo',
        desenvolvimento?.resources || (c.resources || []).join('\n') || '—',
        desenvolvimento?.assessment || 'Oral\nEscrita',
        desenvolvimento?.duration || '25 min',
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [255, 243, 176], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
    columnStyles: stagesColumnStyles,
    tableWidth: cw,
    margin: { left: m, right: m },
  })
  y = getLastY(doc) + 2

  // ═══════ PAGE 3: Conclusão + TPC + Bibliografia ═══════
  doc.addPage('a4', 'l')
  y = m
  pageHeader()

  autoTable(doc, {
    startY: y,
    body: [
      // Conclusão
      [
        { content: 'Conclusão\n(Verificação e Síntese)', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        conclusao?.content || 'Resumo do conteúdo abordado',
        conclusao?.activities?.join('\n') || 'Esclarecer dúvidas\nSíntese da aula',
        conclusao?.methods || 'Expositivo',
        conclusao?.resources || 'Quadro',
        conclusao?.assessment || 'Oral',
        conclusao?.duration || '10 min',
      ],
      // TPC
      [
        { content: 'Orientação da Tarefa\n(TPC)', styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
        { content: tpc?.content || c.homework || '—', colSpan: 5 },
        tpc?.duration || '5 min',
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 },
    columnStyles: stagesColumnStyles,
    tableWidth: cw,
    margin: { left: m, right: m },
  })
  y = getLastY(doc) + 4

  // Bibliografia
  const biblioText = c.bibliography?.map((b, i) => `${i + 1}. ${b}`).join('\n') || '—'
  doc.setDrawColor(0)
  doc.rect(m, y, 28, 12)
  doc.rect(m + 28, y, cw - 28, 12)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Bibliografia', m + 2, y + 7)
  doc.setFont('helvetica', 'normal')
  const bibLines = doc.splitTextToSize(biblioText, cw - 34)
  const bibH = Math.max(12, bibLines.length * 4 + 6)
  doc.rect(m, y, 28, bibH)
  doc.rect(m + 28, y, cw - 28, bibH)
  doc.setFont('helvetica', 'bold')
  doc.text('Bibliografia', m + 2, y + 7)
  doc.setFont('helvetica', 'normal')
  let bibY = y + 5
  for (const line of bibLines) {
    doc.text(line, m + 30, bibY)
    bibY += 4
  }
  y += bibH

  // Notas Críticas
  const notesText = c.criticalNotes || c.observations || ''
  doc.rect(m, y, 28, 12)
  doc.rect(m + 28, y, cw - 28, 12)
  doc.setFont('helvetica', 'bold')
  doc.text('Notas Críticas', m + 2, y + 5)
  doc.setFontSize(7)
  doc.text('(opcional)', m + 2, y + 9)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  if (notesText) {
    doc.text(doc.splitTextToSize(notesText, cw - 34).slice(0, 2), m + 30, y + 7)
  }
  y += 12

  // Footer
  const total = getTotalPages(doc)
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Planifica – Plano de Aula MOD.06.DEM.01 | Página ${p} de ${total}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' },
    )
  }

  const filename = `Plano_Aula_${(plan.subject || '').replace(/\s+/g, '_')}_${(c.topic || '').replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}

// ════════════════════════════════════════════════════════════════
// DOSIFICAÇÃO PDF — MOD.20.DEM.00 (Anual) / MOD.10.DEM.00 (Trimestral)
// Shared function for both ANNUAL and TRIMESTER (landscape)
// ════════════════════════════════════════════════════════════════
function exportDosificacaoPDF(plan: PlanForPDF): void {
  const isAnnual = plan.type === 'ANNUAL'
  const title = isAnnual ? 'DOSIFICAÇÃO ANUAL' : 'DOSIFICAÇÃO TRIMESTRAL'
  const modCode = isAnnual ? 'MOD.20.DEM.00' : 'MOD.10.DEM.00'
  const totalLabel = isAnnual ? 'Total de Aulas / Ano Lectivo:' : 'Total de Aulas por Semana / Trimestre:'

  const doc = new jsPDF('l', 'mm', 'a4') // landscape
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const m = 10 // margin
  const cw = pageWidth - m * 2
  let y = m

  const c = plan.content || {}
  const weeklyPlan = c.weeklyPlan || []

  // ── Header ──
  doc.setFillColor(255, 243, 176)
  doc.rect(m, y, cw, 10, 'F')
  doc.setDrawColor(0)
  doc.rect(m, y, cw, 10)
  doc.setTextColor(0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(title, m + 4, y + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(modCode, pageWidth - m - 4, y + 7, { align: 'right' })
  y += 10

  // ── Info rows ──
  function infoRow(label: string, value: string) {
    doc.setDrawColor(0)
    doc.rect(m, y, cw, 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label, m + 2, y + 5.5)
    const lw = doc.getTextWidth(label) + 3
    doc.setFont('helvetica', 'normal')
    doc.text(value, m + 2 + lw, y + 5.5)
    y += 8
  }

  infoRow('Disciplina: ', plan.subject || '—')
  if (isAnnual) {
    infoRow('Classe: ', `${plan.grade || '—'}  |  Ano Lectivo: ${plan.academicYear || '—'}`)
  } else {
    infoRow('Classe: ', `${plan.grade || '—'}  |  Ano Lectivo: ${plan.academicYear || '—'}  |  Trimestre: ${plan.trimester || 1}º`)
  }
  infoRow('Professor: ', plan.teacher?.name || '________________________')
  y += 2

  // ── Column widths ──
  const col0 = 20  // Semana Lectiva
  const col1 = 38  // Período
  const col2 = 22  // Unidade Didáctica
  const col5 = 20  // Nº de Aulas
  const remaining = cw - col0 - col1 - col2 - col5
  const col3 = remaining / 2  // Objectivos
  const col4 = remaining / 2  // Conteúdos

  // ── Weekly table ──
  const tableBody = weeklyPlan.length > 0
    ? weeklyPlan.map(w => [
        w.week,
        w.period || '',
        w.unit,
        w.objectives,
        w.contents,
        String(w.numLessons),
      ])
    : (c.topics || []).map((topic, i) => [
        `${i + 1}ª`,
        '',
        ['I', 'II', 'III', 'IV', 'V', 'VI'][Math.floor(i / 3)] || 'I',
        (c.specificObjectives || c.generalObjectives || c.objectives || [])[i] || '—',
        topic.title + (topic.subtopics?.length ? '\n' + topic.subtopics.join('\n') : ''),
        '2',
      ])

  const totalLessons = c.totalLessons
    || weeklyPlan.reduce((sum, w) => sum + w.numLessons, 0)
    || (c.topics || []).length * 2

  autoTable(doc, {
    startY: y,
    head: [['Semana\nLectiva', 'Período', 'Unidade\nDidáctica', 'Objectivos', 'Conteúdos', 'Nº de\nAulas']],
    body: [
      ...tableBody,
      [{ content: totalLabel, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } }, { content: String(totalLessons), styles: { fontStyle: 'bold', halign: 'center' } }],
    ],
    theme: 'grid',
    headStyles: { fillColor: [255, 243, 176], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', halign: 'center', valign: 'middle' },
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, valign: 'top' },
    columnStyles: {
      0: { cellWidth: col0, halign: 'center' },
      1: { cellWidth: col1, halign: 'center' },
      2: { cellWidth: col2, halign: 'center' },
      3: { cellWidth: col3 },
      4: { cellWidth: col4 },
      5: { cellWidth: col5, halign: 'center' },
    },
    tableWidth: cw,
    margin: { left: m, right: m },
  })
  y = getLastY(doc) + 4

  // ── Methodology & Assessment (if space) ──
  if (c.methodology) {
    if (y > 160) { doc.addPage('a4', 'l'); y = m }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Metodologia:', m, y + 4)
    doc.setFont('helvetica', 'normal')
    const methLines = doc.splitTextToSize(formatFieldText(c.methodology), cw - 4)
    doc.text(methLines, m + 2, y + 9)
    y += 9 + methLines.length * 4
  }

  if (c.assessment) {
    if (y > 175) { doc.addPage('a4', 'l'); y = m }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Avaliação:', m, y + 4)
    doc.setFont('helvetica', 'normal')
    const assLines = doc.splitTextToSize(formatFieldText(c.assessment), cw - 4)
    doc.text(assLines, m + 2, y + 9)
    y += 9 + assLines.length * 4
  }

  // ── Footer ──
  const total = getTotalPages(doc)
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Planifica – ${title} ${modCode} | Página ${p} de ${total}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' },
    )
  }

  const filename = isAnnual
    ? `Dosificacao_Anual_${(plan.subject || '').replace(/\s+/g, '_')}.pdf`
    : `Dosificacao_Trimestral_${(plan.subject || '').replace(/\s+/g, '_')}_${plan.trimester || 1}T.pdf`
  doc.save(filename)
}

// ════════════════════════════════════════════════════════════════
// BIWEEKLY PLAN PDF — MOD.47.DEM.00 format (landscape)
// ════════════════════════════════════════════════════════════════
function exportBiweeklyPlanPDF(plan: PlanForPDF): void {
  const doc = new jsPDF('l', 'mm', 'a4') // landscape
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const m = 10 // margin
  const cw = pageWidth - m * 2
  let y = m

  const c = plan.content || {}
  const topics = c.topics || []
  const generalObjs = c.generalObjectives || c.objectives || []

  // ── Header ──
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(0)
  doc.rect(m, y, cw, 12)
  doc.setTextColor(0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PLANO QUINZENAL', pageWidth / 2, y + 8, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('MOD.47.DEM.00', pageWidth / 2, y + 11.5, { align: 'center' })
  y += 12

  // ── Form fields ──
  function formRow(label: string, value: string) {
    doc.setDrawColor(0)
    doc.rect(m, y, cw, 7)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label, m + 2, y + 5)
    const lw = doc.getTextWidth(label) + 3
    doc.setFont('helvetica', 'normal')
    doc.text(value, m + 2 + lw, y + 5)
    y += 7
  }

  formRow('PLANIFICAÇÃO REFERENTE A: ', plan.title || '')
  formRow('ANO LECTIVO: ', plan.academicYear || '')
  formRow('Professor: ', plan.teacher?.name || '________________________')
  formRow('Disciplina: ', `${plan.subject || '—'}  /Curso(s): ${plan.grade || '—'}  /Classe(s): ${plan.grade || '—'}`)
  formRow('Unidade Didáctica: ', topics.length > 0 ? topics[0].title : '')

  // Objectivo Geral (multi-line)
  const objText = generalObjs.join('\n') || ''
  const objLines = doc.splitTextToSize(objText, cw - 40)
  const objH = Math.max(10, objLines.length * 4.5 + 5)
  doc.rect(m, y, cw, objH)
  doc.setFont('helvetica', 'bold')
  doc.text('Objectivo Geral: ', m + 2, y + 5)
  doc.setFont('helvetica', 'normal')
  const olw = doc.getTextWidth('Objectivo Geral: ') + 3
  let oy = y + 5
  for (const line of objLines) {
    doc.text(line, m + 2 + olw, oy)
    oy += 4.5
  }
  y += objH + 2

  // ── Table ──
  const col0 = 15  // AULA
  const remaining = cw - col0
  const col1 = remaining * 0.22  // CONTEÚDO PROGRAMÁTICO
  const col2 = remaining * 0.20  // OBJECTIVOS ESPECÍFICOS
  const col3 = remaining * 0.20  // ESTRATÉGIAS DE ENSINO
  const col4 = remaining * 0.20  // EXPECTATIVAS DE APRENDIZAGEM
  const col5 = remaining * 0.18  // AVALIAÇÃO/INSTRUMENTOS

  const tableBody = topics.length > 0
    ? topics.map((topic, i) => {
        const specificObj = (c.specificObjectives || [])[i] || ''
        return [
          String(topic.week || i + 1),
          topic.title + (topic.subtopics?.length ? '\n' + topic.subtopics.map(s => `• ${s}`).join('\n') : ''),
          specificObj,
          formatFieldText(c.methodology) || '',
          (c.competencies || [])[i] || (c.competencies || []).join('\n') || '',
          formatFieldText(c.assessment) || '',
        ]
      })
    : [[' ', ' ', ' ', ' ', ' ', ' ']]

  autoTable(doc, {
    startY: y,
    head: [['AULA', 'CONTEÚDO PROGRAMÁTICO', 'OBJECTIVOS ESPECÍFICOS', 'ESTRATÉGIAS DE ENSINO', 'EXPECTATIVAS DE APRENDIZAGEM', 'AVALIAÇÃO/ INSTRUMENTOS']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', halign: 'center', valign: 'middle' },
    styles: { fontSize: 8, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, valign: 'top' },
    columnStyles: {
      0: { cellWidth: col0, halign: 'center' },
      1: { cellWidth: col1 },
      2: { cellWidth: col2 },
      3: { cellWidth: col3 },
      4: { cellWidth: col4 },
      5: { cellWidth: col5 },
    },
    tableWidth: cw,
    margin: { left: m, right: m },
  })
  y = getLastY(doc) + 8

  // ── Signatures ──
  if (y > pageHeight - 25) { doc.addPage('a4', 'l'); y = m + 10 }
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('O Professor:', m, y)
  doc.setFont('helvetica', 'normal')
  doc.text(plan.teacher?.name || '________________________', m + 25, y)

  doc.setFont('helvetica', 'bold')
  doc.text('O Coordenador de Curso/Disciplina:', pageWidth / 2 - 20, y)
  doc.setFont('helvetica', 'normal')
  doc.text('________________________', pageWidth / 2 + 45, y)

  doc.setFont('helvetica', 'bold')
  doc.text('Data:', pageWidth - m - 50, y)
  doc.setFont('helvetica', 'normal')
  doc.text('___/___/20__', pageWidth - m - 35, y)

  // ── Footer ──
  const total = getTotalPages(doc)
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Planifica – Dosificação Quinzenal MOD.47.DEM.00 | Página ${p} de ${total}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' },
    )
  }

  const filename = `Dosificacao_Quinzenal_${(plan.subject || '').replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}

// ════════════════════════════════════════════════════════════════
// GENERIC PLAN PDF (Annual)
// ════════════════════════════════════════════════════════════════
function exportGenericPlanPDF(plan: PlanForPDF): void {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Header bar ──
  doc.setFillColor(...ACCENT_COLOR)
  doc.rect(0, 0, pageWidth, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Planifica', margin, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestão de Planos Educativos', margin, 22)
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-AO')}`, pageWidth - margin, 22, { align: 'right' })

  y = 42

  // ── Plan title ──
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(plan.title, contentWidth)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 7 + 4

  // ── Meta info ──
  const metaData: string[][] = []
  if (plan.type) metaData.push(['Tipo', TYPE_LABELS[plan.type]])
  if (plan.subject) metaData.push(['Disciplina', plan.subject])
  if (plan.grade) metaData.push(['Classe', plan.grade])
  if (plan.academicYear) metaData.push(['Ano Lectivo', plan.academicYear])
  if (plan.trimester) metaData.push(['Trimestre', `${plan.trimester}º Trimestre`])
  if (plan.status) metaData.push(['Estado', STATUS_LABELS[plan.status] || plan.status])
  if (plan.createdAt) metaData.push(['Criado em', new Date(plan.createdAt).toLocaleDateString('pt-AO')])

  autoTable(doc, {
    startY: y,
    body: metaData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [100, 100, 100] },
      1: { cellWidth: contentWidth - 35 },
    },
    margin: { left: margin, right: margin },
  })
  y = getLastY(doc) + 8

  const content = plan.content || {}

  function sectionTitle(title: string) {
    if (y > 265) {
      doc.addPage()
      y = margin
    }
    doc.setFillColor(...ACCENT_COLOR)
    doc.rect(margin, y, 3, 7, 'F')
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin + 6, y + 5.5)
    y += 12
  }

  function textBlock(text: string) {
    doc.setTextColor(50, 50, 50)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      if (y > 280) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 4.5
    }
    y += 3
  }

  function objList(title: string, items: string[]) {
    sectionTitle(title)
    autoTable(doc, {
      startY: y,
      body: items.map((obj, i) => [`${i + 1}.`, obj]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 10, halign: 'right', textColor: ACCENT_COLOR },
        1: { cellWidth: contentWidth - 10 },
      },
      margin: { left: margin, right: margin },
    })
    y = getLastY(doc) + 6
  }

  // Objectives
  if (content.generalObjectives?.length) objList('Objectivos Gerais', content.generalObjectives)
  if (content.specificObjectives?.length) objList('Objectivos Específicos', content.specificObjectives)
  if (!content.generalObjectives?.length && !content.specificObjectives?.length && content.objectives?.length) {
    objList('Objectivos', content.objectives)
  }

  // Competencies
  if (content.competencies?.length) {
    sectionTitle('Competências')
    autoTable(doc, {
      startY: y,
      body: content.competencies.map(comp => ['•', comp]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 } },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', textColor: ACCENT_COLOR },
        1: { cellWidth: contentWidth - 8 },
      },
      margin: { left: margin, right: margin },
    })
    y = getLastY(doc) + 6
  }

  // Topics
  if (content.topics?.length) {
    sectionTitle('Temas / Conteúdos')
    const topicRows: string[][] = []
    for (const topic of content.topics) {
      const meta = [topic.week ? `Sem. ${topic.week}` : '', topic.duration || ''].filter(Boolean).join(' | ')
      topicRows.push([topic.title, meta])
      if (topic.subtopics) {
        for (const sub of topic.subtopics) {
          topicRows.push([`   • ${sub}`, ''])
        }
      }
    }
    autoTable(doc, {
      startY: y,
      head: [['Tema', 'Detalhes']],
      body: topicRows,
      theme: 'striped',
      headStyles: { fillColor: ACCENT_COLOR, fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.7 },
        1: { cellWidth: contentWidth * 0.3, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    })
    y = getLastY(doc) + 6
  }

  // Methodology
  if (content.methodology) {
    sectionTitle('Metodologia')
    textBlock(formatFieldText(content.methodology))
  }

  // Resources
  if (content.resources?.length) {
    sectionTitle('Recursos')
    textBlock(content.resources.join('  •  '))
  }

  // Assessment
  if (content.assessment) {
    sectionTitle('Avaliação')
    textBlock(formatFieldText(content.assessment))
  }

  // Observations
  if (content.observations) {
    sectionTitle('Observações')
    textBlock(content.observations)
  }

  // Footer
  const total = getTotalPages(doc)
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Planifica – ${plan.type ? TYPE_LABELS[plan.type] : 'Plano'} | Página ${p} de ${total}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' },
    )
  }

  const filename = `${plan.title.replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}

// ════════════════════════════════════════════════════════════════
// Main export function — routes to the correct layout
// ════════════════════════════════════════════════════════════════
export function exportPlanToPDF(plan: PlanForPDF): void {
  if (plan.type === 'LESSON') {
    exportLessonPlanPDF(plan)
  } else if (plan.type === 'TRIMESTER' || plan.type === 'ANNUAL') {
    exportDosificacaoPDF(plan)
  } else if (plan.type === 'BIWEEKLY') {
    exportBiweeklyPlanPDF(plan)
  } else {
    exportGenericPlanPDF(plan)
  }
}
