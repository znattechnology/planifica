import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
} from 'docx'
import { saveAs } from 'file-saver'

interface PlanoAnualForWord {
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

const borders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
}

function fieldRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({ text: value, size: 20 }),
    ],
  })
}

function headerCell(text: string): TableCell {
  return new TableCell({
    borders,
    shading: { type: ShadingType.SOLID, color: 'E6E6E6' },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 16 })],
    })],
  })
}

function cell(text: string, options?: { bold?: boolean; shading?: string; columnSpan?: number }): TableCell {
  return new TableCell({
    borders,
    columnSpan: options?.columnSpan,
    shading: options?.shading ? { type: ShadingType.SOLID, color: options.shading } : undefined,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: options?.bold, size: 16 })],
    })],
  })
}

export async function exportPlanoAnualToWord(plano: PlanoAnualForWord): Promise<void> {
  const c = plano.content
  const unidades = c.unidades || []

  const headerParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'MOD.20.DEM.00', size: 16 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'PLANO DE ENSINO DA DISCIPLINA', bold: true, size: 28 })],
    }),
    fieldRow('Nome da instituição', plano.teacher?.school || ''),
    fieldRow('Disciplina', plano.subject),
    fieldRow('Regime', c.regime || ''),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Ano lectivo: ', bold: true, size: 20 }),
        new TextRun({ text: plano.academicYear, size: 20 }),
        new TextRun({ text: '    Curso: ', bold: true, size: 20 }),
        new TextRun({ text: c.curso || '', size: 20 }),
        new TextRun({ text: '    Classe: ', bold: true, size: 20 }),
        new TextRun({ text: plano.grade, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Horas semanais: ', bold: true, size: 20 }),
        new TextRun({ text: String(c.horasSemanais || ''), size: 20 }),
        new TextRun({ text: '    Total de horas: ', bold: true, size: 20 }),
        new TextRun({ text: String(c.totalHoras || ''), size: 20 }),
      ],
    }),
    fieldRow('Nº de aulas (incl. avaliações)', String(c.numAulas || '')),
    fieldRow('O professor', plano.teacher?.name || ''),
  ]

  if (c.fundamentacao) {
    headerParagraphs.push(
      new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Fundamentação ou justificativa da disciplina:', bold: true, size: 20 })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: c.fundamentacao, size: 18 })] }),
    )
  }

  if (c.objectivosGerais) {
    headerParagraphs.push(
      new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Objectivos gerais da disciplina:', bold: true, size: 20 })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: c.objectivosGerais, size: 18 })] }),
    )
  }

  // ── Table rows ──
  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        headerCell('Objectivos específicos'),
        headerCell('Conteúdos'),
        headerCell('Nº aulas'),
        headerCell('Métodos ou estratégias'),
        headerCell('Recursos ou meio de ensino'),
      ],
    }),
  ]

  for (const unidade of unidades) {
    tableRows.push(new TableRow({
      children: [cell(unidade.nome, { bold: true, shading: 'F0F0F0', columnSpan: 5 })],
    }))
    for (const t of unidade.topicos) {
      tableRows.push(new TableRow({
        children: [
          cell(t.objectivosEspecificos || ''),
          cell(t.conteudos || ''),
          cell(String(t.numAulas || '')),
          cell(t.metodos || ''),
          cell(t.recursos || ''),
        ],
      }))
    }
  }

  const table = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  const footerParagraphs: Paragraph[] = []
  if (c.avaliacao) {
    footerParagraphs.push(
      new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Avaliação', bold: true, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: c.avaliacao, size: 18 })] }),
    )
  }
  if (c.bibliografia) {
    footerParagraphs.push(
      new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Bibliografia', bold: true, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: c.bibliografia, size: 18 })] }),
    )
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
      },
      children: [...headerParagraphs, table, ...footerParagraphs],
    }],
  })

  const buffer = await Packer.toBlob(doc)
  const filename = `Plano_Anual_${plano.subject}_${plano.grade}.docx`.replace(/\s+/g, '_')
  saveAs(buffer, filename)
}
