import { z } from 'zod'
import { CreateDosificacaoDTO } from '@/src/application/dtos/dosificacao'

// Legacy validator for server-side controllers
export function validateCreateDosificacao(data: unknown): CreateDosificacaoDTO {
  const dto = data as CreateDosificacaoDTO

  if (!dto.title?.trim()) throw new Error('title is required')
  if (!dto.subject?.trim()) throw new Error('subject is required')
  if (!dto.grade?.trim()) throw new Error('grade is required')
  if (!dto.academicYear?.trim()) throw new Error('academicYear is required')
  if (!dto.content?.unidades?.length) throw new Error('content.unidades is required')

  return dto
}

// ─── Client-side Zod schemas for form validation ───

const topicoSchema = z.object({
  id: z.string(),
  objectivosEspecificos: z.string(),
  conteudos: z.string().min(1, 'O conteúdo é obrigatório'),
  numAulas: z.string(),
  metodos: z.string(),
  recursos: z.string(),
})

const unidadeSchema = z.object({
  id: z.string(),
  nome: z.string().min(1, 'O nome da unidade é obrigatório'),
  topicos: z.array(topicoSchema).min(1, 'Adicione pelo menos um tópico'),
  isOpen: z.boolean().optional(),
})

export const planoAnualSchema = z.object({
  title: z
    .string()
    .min(1, 'O título é obrigatório')
    .min(5, 'O título deve ter pelo menos 5 caracteres')
    .max(200, 'O título não pode exceder 200 caracteres'),
  subject: z
    .string()
    .min(1, 'A disciplina é obrigatória'),
  grade: z
    .string()
    .min(1, 'A classe é obrigatória'),
  academicYear: z
    .string()
    .min(1, 'O ano lectivo é obrigatório'),
  regime: z.string(),
  curso: z.string(),
  horasSemanais: z
    .string()
    .min(1, 'As horas semanais são obrigatórias')
    .refine((val) => Number(val) >= 1 && Number(val) <= 40, 'Insira um valor entre 1 e 40'),
  totalHoras: z.string(),
  numAulas: z.string(),
  fundamentacao: z.string(),
  objectivosGerais: z.string(),
  avaliacao: z.string(),
  bibliografia: z.string(),
  unidades: z
    .array(unidadeSchema)
    .min(1, 'Adicione pelo menos uma unidade'),
})

export type PlanoAnualFormData = z.infer<typeof planoAnualSchema>
export type UnidadeFormData = z.infer<typeof unidadeSchema>
export type TopicoFormData = z.infer<typeof topicoSchema>

// Keep old exports for backward compatibility during migration
export const dosificacaoSchema = planoAnualSchema
export type DosificacaoFormData = PlanoAnualFormData
