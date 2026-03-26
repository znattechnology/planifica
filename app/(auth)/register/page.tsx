'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { FormError, FormAlert } from '@/src/ui/components/ui/form-error'
import { registerSchema, type RegisterFormData } from '@/src/application/validators/auth.validator'
import { useAuth } from '@/src/ui/providers/auth-provider'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register: registerUser } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password', '')

  // Password strength indicators
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  async function onSubmit(data: RegisterFormData) {
    setServerError('')
    setIsSubmitting(true)
    try {
      await registerUser(data.name, data.email, data.password)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Não foi possível criar a conta. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Criar conta grátis
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comece a planear de forma inteligente em minutos
        </p>
      </div>

      {/* Server Error */}
      {serverError && <FormAlert message={serverError} />}

      {/* Form */}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="O seu nome"
              className="pl-10"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
          </div>
          <FormError message={errors.name?.message} />
        </div>

        {/* Email */}
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

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Palavra-passe</Label>
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
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {/* Password strength — visible while typing OR when there's a validation error */}
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

        {/* Benefits */}
        <div className="space-y-2 rounded-lg border border-border/40 bg-card/30 p-3">
          {[
            'Planos gerados automaticamente por IA',
            'Relatórios trimestrais e anuais',
            'Exportação para PDF e Word',
          ].map((benefit, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs text-muted-foreground">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A criar conta...
            </>
          ) : (
            'Criar conta'
          )}
        </Button>
      </form>

      {/* Terms */}
      <p className="text-center text-xs text-muted-foreground">
        Ao criar conta, concorda com os{' '}
        <Link href="#" className="text-accent hover:underline">
          Termos de Uso
        </Link>{' '}
        e a{' '}
        <Link href="#" className="text-accent hover:underline">
          Política de Privacidade
        </Link>
      </p>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {/* Social Register */}
      <Button
        variant="outline"
        className="w-full border-border/60"
        type="button"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Registar com Google
      </Button>

      {/* Login Link */}
      <p className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
