import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface PlanoAnualForExcel {
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

const headerFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE6E6E6' },
}

const thinBorder: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } }
const allBorders: Partial<ExcelJS.Borders> = {
  top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder,
}

export async function exportPlanoAnualToExcel(plano: PlanoAnualForExcel): Promise<void> {
  const c = plano.content
  const unidades = c.unidades || []

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Planifica'
  const ws = workbook.addWorksheet('Plano Anual', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
  })

  ws.columns = [
    { width: 25 },
    { width: 25 },
    { width: 10 },
    { width: 25 },
    { width: 25 },
  ]

  let row = 1

  // ── Header ──
  ws.mergeCells(row, 1, row, 5)
  const modCell = ws.getCell(row, 1)
  modCell.value = 'MOD.20.DEM.00'
  modCell.alignment = { horizontal: 'right' }
  modCell.font = { size: 8 }
  row++

  ws.mergeCells(row, 1, row, 5)
  const titleCell = ws.getCell(row, 1)
  titleCell.value = 'PLANO DE ENSINO DA DISCIPLINA'
  titleCell.font = { size: 14, bold: true }
  titleCell.alignment = { horizontal: 'center' }
  row += 2

  // ── Info fields ──
  const infoFields: [string, string][] = [
    ['Nome da instituição', plano.teacher?.school || ''],
    ['Disciplina', plano.subject],
    ['Regime', c.regime || ''],
    ['Ano lectivo', plano.academicYear],
    ['Curso', c.curso || ''],
    ['Classe', plano.grade],
    ['Horas semanais', String(c.horasSemanais || '')],
    ['Total de horas', String(c.totalHoras || '')],
    ['Nº de aulas (incl. avaliações)', String(c.numAulas || '')],
    ['O professor', plano.teacher?.name || ''],
  ]

  for (const [label, value] of infoFields) {
    ws.mergeCells(row, 1, row, 2)
    ws.getCell(row, 1).value = label
    ws.getCell(row, 1).font = { bold: true, size: 9 }
    ws.mergeCells(row, 3, row, 5)
    ws.getCell(row, 3).value = value
    ws.getCell(row, 3).font = { size: 9 }
    row++
  }

  row++

  // ── Fundamentação ──
  if (c.fundamentacao) {
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = 'Fundamentação ou justificativa da disciplina:'
    ws.getCell(row, 1).font = { bold: true, size: 9 }
    row++
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = c.fundamentacao
    ws.getCell(row, 1).font = { size: 8 }
    ws.getCell(row, 1).alignment = { wrapText: true }
    ws.getRow(row).height = 40
    row += 2
  }

  // ── Objectivos gerais ──
  if (c.objectivosGerais) {
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = 'Objectivos gerais da disciplina:'
    ws.getCell(row, 1).font = { bold: true, size: 9 }
    row++
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = c.objectivosGerais
    ws.getCell(row, 1).font = { size: 8 }
    ws.getCell(row, 1).alignment = { wrapText: true }
    ws.getRow(row).height = 40
    row += 2
  }

  // ── Content table header ──
  const headers = ['Objectivos específicos', 'Conteúdos', 'Nº aulas', 'Métodos ou estratégias', 'Recursos ou meio de ensino']
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 8 }
    cell.fill = headerFill
    cell.border = allBorders
    cell.alignment = { horizontal: i === 2 ? 'center' : 'left', wrapText: true }
  })
  row++

  // ── Unidades + Tópicos ──
  for (const unidade of unidades) {
    ws.mergeCells(row, 1, row, 5)
    const uCell = ws.getCell(row, 1)
    uCell.value = unidade.nome
    uCell.font = { bold: true, size: 9 }
    uCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
    uCell.border = allBorders
    row++

    for (const t of unidade.topicos) {
      const values = [
        t.objectivosEspecificos || '',
        t.conteudos || '',
        t.numAulas ? String(t.numAulas) : '',
        t.metodos || '',
        t.recursos || '',
      ]
      values.forEach((v, i) => {
        const cell = ws.getCell(row, i + 1)
        cell.value = v
        cell.font = { size: 8 }
        cell.border = allBorders
        cell.alignment = { wrapText: true, horizontal: i === 2 ? 'center' : 'left', vertical: 'top' }
      })
      ws.getRow(row).height = 30
      row++
    }
  }

  row++

  // ── Avaliação ──
  if (c.avaliacao) {
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = 'Avaliação'
    ws.getCell(row, 1).font = { bold: true, size: 9 }
    row++
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = c.avaliacao
    ws.getCell(row, 1).font = { size: 8 }
    ws.getCell(row, 1).alignment = { wrapText: true }
    ws.getRow(row).height = 40
    row += 2
  }

  // ── Bibliografia ──
  if (c.bibliografia) {
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = 'Bibliografia'
    ws.getCell(row, 1).font = { bold: true, size: 9 }
    row++
    ws.mergeCells(row, 1, row, 5)
    ws.getCell(row, 1).value = c.bibliografia
    ws.getCell(row, 1).font = { size: 8 }
    ws.getCell(row, 1).alignment = { wrapText: true }
    ws.getRow(row).height = 40
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `Plano_Anual_${plano.subject}_${plano.grade}.xlsx`.replace(/\s+/g, '_')
  saveAs(new Blob([buffer]), filename)
}
