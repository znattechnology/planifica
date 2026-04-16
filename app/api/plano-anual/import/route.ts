import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/src/shared/lib/auth-cookies'
import { container } from '@/src/main/container'
import { handleApiError } from '@/src/shared/lib/api-response'
import { extractTextFromFile } from '@/src/shared/lib/file-extractors'
import { DocumentParserService } from '@/src/ai/services/document-parser.service'
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMITS } from '@/src/shared/lib/rate-limit'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request)
    const rateCheck = checkRateLimit(`plano-import:${ip}`, RATE_LIMITS.API_WRITE)
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck)
    }

    // Auth
    const accessToken = getAccessToken(request)
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } },
        { status: 401 },
      )
    }
    await container.authController.me(accessToken)

    // Parse multipart form
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Nenhum ficheiro enviado' } },
        { status: 422 },
      )
    }

    // Validate file type
    const name = file.name.toLowerCase()
    let fileType = ''
    if (name.endsWith('.pdf')) fileType = 'pdf'
    else if (name.endsWith('.docx')) fileType = 'docx'
    else if (name.endsWith('.xlsx')) fileType = 'xlsx'
    else {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Formato não suportado. Use PDF, Word (.docx) ou Excel (.xlsx).' } },
        { status: 422 },
      )
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Ficheiro demasiado grande. O limite é 10MB.' } },
        { status: 422 },
      )
    }

    // Extract text
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText: string
    try {
      extractedText = await extractTextFromFile(buffer, fileType)
    } catch (extractErr) {
      console.error('[PlanoAnual Import] Extraction error:', extractErr)
      return NextResponse.json(
        { success: false, error: { code: 'PARSE_ERROR', message: 'Não foi possível ler o conteúdo do ficheiro. Verifique se o ficheiro não está corrompido.' } },
        { status: 422 },
      )
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_FILE', message: 'O ficheiro parece estar vazio ou não contém texto extraível.' } },
        { status: 422 },
      )
    }

    // AI extraction
    const parser = new DocumentParserService()
    const parsed = await parser.parseDocument(extractedText, fileType)

    return NextResponse.json({ success: true, data: parsed })
  } catch (err) {
    console.error('[PlanoAnual Import] Error:', err)
    return handleApiError(err)
  }
}
