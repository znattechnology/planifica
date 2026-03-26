'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { FormError, FormAlert } from '@/src/ui/components/ui/form-error'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/src/application/validators/auth.validator'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const password = watch('password', '')
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  async function onSubmit(data: ResetPasswordFormData) {
    setServerError('')
    setIsSubmitting(true)
    try {
      const res = await fetch(API_ROUTES.AUTH_RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...data }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Erro ao redefinir a palavra-passe')
      }

      setSuccess(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao redefinir a palavra-passe')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Link inválido</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Este link de recuperação é inválido ou está incompleto. Solicite um novo link.
          </p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href="/forgot-password">Solicitar novo link</Link>
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Palavra-passe redefinida!
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            A sua palavra-passe foi alterada com sucesso. Já pode iniciar sessão com a nova palavra-passe.
          </p>
        </div>
        <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Redefinir palavra-passe
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Insira a sua nova palavra-passe abaixo.
        </p>
      </div>

      {serverError && <FormAlert message={serverError} />}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Nova palavra-passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              className="pl-10 pr-10"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {(password || errors.password) && (
            <div className={`space-y-1.5 rounded-lg border p-3 ${
              errors.password
                ? 'border-destructive/40 bg-destructive/5'
                : 'border-border/40 bg-card/30'
            }`}>
              <p className={`text-xs font-medium ${errors.password ? 'text-destructive' : 'text-muted-foreground'}`}>
                {errors.password ? 'A palavra-passe não cumpre os requisitos:' : 'Requisitos da palavra-passe:'}
              </p>
              {[
                { check: hasMinLength, label: 'Pelo menos 8 caracteres' },
                { check: hasUppercase, label: 'Pelo menos uma letra maiúscula (A-Z)' },
                { check: hasNumber, label: 'Pelo menos um número (0-9)' },
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-2">
                  {rule.check ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                  ) : (
                    <XCircle className={`h-3.5 w-3.5 shrink-0 ${errors.password ? 'text-destructive' : 'text-muted-foreground/40'}`} />
                  )}
                  <span
                    className={`text-xs ${
                      rule.check
                        ? 'text-accent'
                        : errors.password
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar nova palavra-passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a nova palavra-passe"
              className="pl-10"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </div>
          <FormError message={errors.confirmPassword?.message} />
        </div>

        <Button
          type="submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A redefinir...
            </>
          ) : (
            'Redefinir palavra-passe'
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
