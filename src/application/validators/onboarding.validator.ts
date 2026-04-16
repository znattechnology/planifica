import { z } from 'zod';

export const onboardingSchema = z.object({
  schoolName: z.string().min(2, 'Nome da escola é obrigatório').max(200),
  country: z.string().min(2, 'País é obrigatório').max(100),
  academicYear: z.string().min(4, 'Ano lectivo é obrigatório').max(20),
  subjects: z.array(z.string().min(1)).min(1, 'Seleccione pelo menos uma disciplina'),
  classes: z.array(z.string().min(1)).min(1, 'Seleccione pelo menos uma classe'),
  numberOfClasses: z.number().int().min(1, 'Número de turmas deve ser pelo menos 1').max(50),
  teachingStyle: z.string().optional(),
  selectedCalendarId: z.string().optional(),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;
