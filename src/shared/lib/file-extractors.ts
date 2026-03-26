/**
 * Server-side document text extraction for PDF, Word (.docx), and Excel (.xlsx)
 */

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const result = await pdfParse(buffer)
  return result.text
}

export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function extractTextFromExcel(buffer: Buffer): Promise<string> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const lines: string[] = []

  workbook.eachSheet((sheet) => {
    lines.push(`=== ${sheet.name} ===`)
    sheet.eachRow((row) => {
      const values = (row.values as (string | number | null | undefined)[])
        .slice(1) // ExcelJS rows are 1-indexed, values[0] is undefined
        .map((v) => (v != null ? String(v).trim() : ''))
        .filter(Boolean)
      if (values.length > 0) {
        lines.push(values.join(' | '))
      }
    })
    lines.push('')
  })

  return lines.join('\n')
}

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function validateUploadedFile(file: File): { valid: boolean; error?: string; fileType?: string } {
  if (!ALLOWED_TYPES.has(file.type)) {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.xlsx')) {
      return { valid: false, error: 'Formato não suportado. Use PDF, Word (.docx) ou Excel (.xlsx).' }
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Ficheiro demasiado grande. O limite é 10MB.' }
  }

  const name = file.name.toLowerCase()
  let fileType = 'pdf'
  if (name.endsWith('.docx')) fileType = 'docx'
  else if (name.endsWith('.xlsx')) fileType = 'xlsx'

  return { valid: true, fileType }
}

export async function extractTextFromFile(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractTextFromPDF(buffer)
    case 'docx':
      return extractTextFromWord(buffer)
    case 'xlsx':
      return extractTextFromExcel(buffer)
    default:
      throw new Error(`Tipo de ficheiro não suportado: ${fileType}`)
  }
}
