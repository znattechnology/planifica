import { z } from 'zod'

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'O nome é obrigatório')
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome não pode exceder 100 caracteres'),
  email: z
    .string()
    .min(1, 'O email é obrigatório')
    .email('Insira um email válido'),
  school: z
    .string()
    .max(200, 'O nome da escola não pode exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  subject: z
    .string()
    .optional()
    .or(z.literal('')),
})

export type ProfileFormData = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'A palavra-passe actual é obrigatória'),
    newPassword: z
      .string()
      .min(1, 'A nova palavra-passe é obrigatória')
      .min(8, 'A palavra-passe deve ter pelo menos 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Deve conter pelo menos um número'),
    confirmPassword: z
      .string()
      .min(1, 'A confirmação é obrigatória'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As palavras-passe não coincidem',
    path: ['confirmPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
