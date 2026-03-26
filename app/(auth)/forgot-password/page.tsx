'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { FormError, FormAlert } from '@/src/ui/components/ui/form-error'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/src/application/validators/auth.validator'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    setServerError('')
    setIsSubmitting(true)
    try {
      const res = await fetch(API_ROUTES.AUTH_FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error?.message || 'Erro ao enviar email')
      }

      setSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível enviar o email. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Email enviado!</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Enviámos instruções para <strong className="text-foreground">{getValues('email')}</strong>.
            Verifique a sua caixa de entrada e siga as instruções para redefinir a sua palavra-passe.
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full border-border/60"
          onClick={() => setSent(false)}
        >
          Enviar novamente
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Lembrou-se da palavra-passe?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao login
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Recuperar palavra-passe
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Insira o seu email e enviaremos instruções para redefinir a sua palavra-passe.
        </p>
      </div>

      {/* Server Error */}
      {serverError && <FormAlert message={serverError} />}

      {/* Form */}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className="pl-10"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </div>
          <FormError message={errors.email?.message} />
        </div>

        <Button
          type="submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A enviar...
            </>
          ) : (
            'Enviar instruções'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Lembrou-se da palavra-passe?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
