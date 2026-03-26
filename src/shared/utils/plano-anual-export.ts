import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PlanoAnualForPDF {
  title: string
  subject: string
  grade: string
  academicYear: string
  content: {
    regime?: string
    curso?: string
    horasSemanais?: number
    totalHoras?: number
    numAulas?: number
    fundamentacao?: string
    objectivosGerais?: string
    avaliacao?: string
    bibliografia?: string
    unidades?: {
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
  teacher?: { name: string; school?: string }
}

export function exportPlanoAnualToPDF(plano: PlanoAnualForPDF): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const c = plano.content
  const unidades = c.unidades || []
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Header ──
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('MOD.20.DEM.00', pageWidth - margin, y, { align: 'right' })

  y += 8
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PLANO DE ENSINO DA DISCIPLINA', pageWidth / 2, y, { align: 'center' })
  y += 10

  // ── Info fields ──
  doc.setFontSize(9)
  const fields: [string, string][] = [
    ['Nome da instituição', plano.teacher?.school || ''],
    ['Disciplina', plano.subject],
    ['Regime', c.regime || ''],
  ]
  for (const [label, value] of fields) {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, margin + 45, y)
    doc.line(margin + 45, y + 1, pageWidth - margin, y + 1)
    y += 6
  }

  // Inline fields row 1
  doc.setFont('helvetica', 'bold')
  doc.text('Ano lectivo:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(plano.academicYear, margin + 28, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Curso:', margin + 55, y)
  doc.setFont('helvetica', 'normal')
  doc.text(c.curso || '', margin + 70, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Classe:', pageWidth - margin - 40, y)
  doc.setFont('helvetica', 'normal')
  doc.text(plano.grade, pageWidth - margin - 22, y)
  y += 6

  // Inline fields row 2
  doc.setFont('helvetica', 'bold')
  doc.text('Horas semanais:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(c.horasSemanais || ''), margin + 35, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Total de horas:', margin + 55, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(c.totalHoras || ''), margin + 85, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.text('Nº de aulas (incl. avaliações):', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(c.numAulas || ''), margin + 60, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.text('O professor:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(plano.teacher?.name || '', margin + 28, y)
  y += 8

  // ── Fundamentação ──
  if (c.fundamentacao) {
    doc.setFont('helvetica', 'bold')
    doc.text('Fundamentação ou justificativa da disciplina:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(c.fundamentacao, contentWidth)
    doc.text(lines, margin, y)
    y += lines.length * 3.5 + 4
    doc.setFontSize(9)
  }

  // ── Objectivos gerais ──
  if (c.objectivosGerais) {
    if (y > 250) { doc.addPage(); y = margin }
    doc.setFont('helvetica', 'bold')
    doc.text('Objectivos gerais da disciplina:', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(c.objectivosGerais, contentWidth)
    doc.text(lines, margin, y)
    y += lines.length * 3.5 + 4
    doc.setFontSize(9)
  }

  // ── Conteúdos table ──
  if (y > 220) { doc.addPage(); y = margin }

  const tableBody: (string | { content: string; colSpan: number; styles: Record<string, unknown> })[][] = []
  for (const unidade of unidades) {
    tableBody.push([{
      content: unidade.nome,
      colSpan: 5,
      styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] },
    }])
    for (const t of unidade.topicos) {
      tableBody.push([
        t.objectivosEspecificos || '',
        t.conteudos || '',
        String(t.numAulas || ''),
        t.metodos || '',
        t.recursos || '',
      ])
    }
  }

  autoTable(doc, {
    startY: y,
    head: [['Objectivos específicos', 'Conteúdos', 'Nº aulas', 'Métodos ou estratégias', 'Recursos ou meio de ensino']],
    body: tableBody,
    styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold' },
    theme: 'grid',
    margin: { left: margin, right: margin },
    columnStyles: {
      2: { halign: 'center', cellWidth: 18 },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY + 8 || y + 20

  // ── Avaliação ──
  if (c.avaliacao) {
    if (y > 250) { doc.addPage(); y = margin }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Avaliação', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(c.avaliacao, contentWidth)
    doc.text(lines, margin, y)
    y += lines.length * 3.5 + 6
  }

  // ── Bibliografia ──
  if (c.bibliografia) {
    if (y > 250) { doc.addPage(); y = margin }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Bibliografia', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(c.bibliografia, contentWidth)
    doc.text(lines, margin, y)
  }

  const filename = `Plano_Anual_${plano.subject}_${plano.grade}.pdf`.replace(/\s+/g, '_')
  doc.save(filename)
}
