import { z } from 'zod'
import { GenerateReportDTO } from '@/src/application/dtos/report'
import { ReportType } from '@/src/domain/entities/report.entity'

// Legacy validator for server-side controllers
export function validateGenerateReport(data: unknown): GenerateReportDTO {
  const dto = data as GenerateReportDTO

  if (!dto.type || !Object.values(ReportType).includes(dto.type)) {
    throw new Error(`type must be one of: ${Object.values(ReportType).join(', ')}`)
  }

  if (!dto.subject?.trim()) throw new Error('subject is required')
  if (!dto.grade?.trim()) throw new Error('grade is required')
  if (!dto.academicYear?.trim()) throw new Error('academicYear is required')

  if (dto.type === ReportType.TRIMESTER) {
    if (!dto.trimester || dto.trimester < 1 || dto.trimester > 3) {
      throw new Error('trimester (1-3) is required for trimester reports')
    }
  }

  return {
    type: dto.type,
    subject: dto.subject.trim(),
    grade: dto.grade.trim(),
    academicYear: dto.academicYear.trim(),
    trimester: dto.trimester,
    additionalContext: dto.additionalContext,
  }
}

// Client-side Zod schema for form validation
export const reportSchema = z
  .object({
    reportType: z.enum(['TRIMESTER', 'ANNUAL'], {
      message: 'O tipo de relatório é obrigatório',
    }),
    subject: z
      .string()
      .min(1, 'A disciplina é obrigatória'),
    grade: z
      .string()
      .min(1, 'A classe é obrigatória'),
    academicYear: z
      .string()
      .min(1, 'O ano lectivo é obrigatório')
      .regex(/^\d{4}$/, 'Insira um ano válido (ex: 2025)'),
    trimester: z
      .string()
      .optional()
      .or(z.literal('')),
    additionalContext: z
      .string()
      .max(2000, 'O contexto adicional não pode exceder 2000 caracteres')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => data.reportType !== 'TRIMESTER' || (data.trimester && data.trimester.length > 0),
    {
      message: 'O trimestre é obrigatório para relatórios trimestrais',
      path: ['trimester'],
    },
  )

export type ReportFormData = z.infer<typeof reportSchema>
