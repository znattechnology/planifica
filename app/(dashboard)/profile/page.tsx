'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  User,
  Mail,
  Building2,
  BookOpen,
  Camera,
  Save,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Select } from '@/src/ui/components/ui/select'
import { Badge } from '@/src/ui/components/ui/badge'
import { FormError, FormAlert } from '@/src/ui/components/ui/form-error'
import {
  profileSchema,
  changePasswordSchema,
  type ProfileFormData,
  type ChangePasswordFormData,
} from '@/src/application/validators/profile.validator'
import { useAuth } from '@/src/ui/providers/auth-provider'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

const ROLE_LABELS: Record<string, string> = {
  TEACHER: 'Professor',
  COORDINATOR: 'Coordenador',
  ADMIN: 'Administrador',
}

const SUBJECTS = [
  'Matemática', 'Física', 'Química', 'Biologia', 'Língua Portuguesa',
  'Inglês', 'Francês', 'História', 'Geografia', 'Filosofia',
  'Educação Visual', 'Educação Física', 'Informática', 'Empreendedorismo',
]

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth()
  const [profileServerError, setProfileServerError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordServerError, setPasswordServerError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Password change verification state
  const [passwordChangeStep, setPasswordChangeStep] = useState<'form' | 'verify'>('form')
  const [verifyCode, setVerifyCode] = useState<string[]>(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: savingProfile },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      school: '',
      subject: '',
    },
  })

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: savingPassword },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const newPassword = watchPassword('newPassword', '')
  const newPwHasMinLength = newPassword.length >= 8
  const newPwHasUppercase = /[A-Z]/.test(newPassword)
  const newPwHasNumber = /[0-9]/.test(newPassword)

  // Populate profile form when user data loads
  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name,
        email: user.email,
        school: user.school || '',
        subject: user.subject || '',
      })
    }
  }, [user, resetProfile])

  // Focus first code input when entering verify step
  useEffect(() => {
    if (passwordChangeStep === 'verify') {
      codeInputRefs.current[0]?.focus()
    }
  }, [passwordChangeStep])

  async function onSaveProfile(data: ProfileFormData) {
    setProfileServerError('')
    setProfileSuccess('')
    try {
      const res = await fetch(API_ROUTES.AUTH_PROFILE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Erro ao guardar alterações')
      }

      await refreshUser()
      setProfileSuccess('Perfil actualizado com sucesso.')
    } catch (err) {
      setProfileServerError(err instanceof Error ? err.message : 'Não foi possível guardar as alterações. Tente novamente.')
    }
  }

  async function onChangePassword(data: ChangePasswordFormData) {
    setPasswordServerError('')
    setPasswordSuccess('')
    try {
      const res = await fetch(API_ROUTES.AUTH_CHANGE_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Erro ao alterar palavra-passe')
      }

      if (result.data?.requiresVerification) {
        // Move to verification step
        setPasswordChangeStep('verify')
        setVerifyCode(['', '', '', '', '', ''])
        setVerifyError('')
      }
    } catch (err) {
      setPasswordServerError(err instanceof Error ? err.message : 'Não foi possível alterar a palavra-passe. Tente novamente.')
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newCode = [...verifyCode]
    newCode[index] = value.slice(-1)
    setVerifyCode(newCode)

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits filled
    const fullCode = newCode.join('')
    if (fullCode.length === 6 && newCode.every(d => d !== '')) {
      handleConfirmPasswordChange(fullCode)
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newCode = [...verifyCode]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ''
    }
    setVerifyCode(newCode)

    if (pasted.length === 6) {
      handleConfirmPasswordChange(pasted)
    } else {
      codeInputRefs.current[pasted.length]?.focus()
    }
  }

  async function handleConfirmPasswordChange(fullCode?: string) {
    const codeStr = fullCode || verifyCode.join('')
    if (codeStr.length !== 6) return

    setVerifyError('')
    setIsVerifying(true)
    try {
      const res = await fetch(API_ROUTES.AUTH_CHANGE_PASSWORD_CONFIRM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeStr }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Código inválido')
      }

      // Success!
      setPasswordChangeStep('form')
      resetPassword()
      setPasswordSuccess('Palavra-passe alterada com sucesso.')
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Código inválido. Tente novamente.')
      setVerifyCode(['', '', '', '', '', ''])
      codeInputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  function handleBackToPasswordForm() {
    setPasswordChangeStep('form')
    setVerifyCode(['', '', '', '', '', ''])
    setVerifyError('')
  }

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gira as suas informações pessoais e configurações de conta.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 sm:h-24 sm:w-24">
              <span className="text-2xl font-bold text-accent sm:text-3xl">
                {initials}
              </span>
            </div>
            <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-accent text-accent-foreground hover:bg-accent/90">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="accent">
                <Shield className="mr-1 h-3 w-3" />
                {ROLE_LABELS[user.role] || user.role}
              </Badge>
              {user.school && (
                <Badge variant="secondary">
                  <Building2 className="mr-1 h-3 w-3" />
                  {user.school}
                </Badge>
              )}
              {user.subject && (
                <Badge variant="secondary">
                  <BookOpen className="mr-1 h-3 w-3" />
                  {user.subject}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info Form */}
      {profileServerError && <FormAlert message={profileServerError} />}
      {profileSuccess && <FormAlert message={profileSuccess} variant="success" />}

      <form onSubmit={handleSubmitProfile(onSaveProfile)}>
        <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <User className="h-4 w-4 text-accent" />
            </div>
            <h2 className="text-base font-semibold">Informações Pessoais</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="mr-1.5 inline h-3.5 w-3.5" />
                Nome completo
              </Label>
              <Input
                id="name"
                aria-invalid={!!profileErrors.name}
                {...registerProfile('name')}
              />
              <FormError message={profileErrors.name?.message} />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                aria-invalid={!!profileErrors.email}
                {...registerProfile('email')}
              />
              <FormError message={profileErrors.email?.message} />
            </div>

            {/* Escola */}
            <div className="space-y-2">
              <Label htmlFor="school">
                <Building2 className="mr-1.5 inline h-3.5 w-3.5" />
                Escola
              </Label>
              <Input
                id="school"
                placeholder="Nome da escola"
                {...registerProfile('school')}
              />
              <FormError message={profileErrors.school?.message} />
            </div>

            {/* Disciplina Principal */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                <BookOpen className="mr-1.5 inline h-3.5 w-3.5" />
                Disciplina Principal
              </Label>
              <Select
                id="subject"
                {...registerProfile('subject')}
              >
                <option value="">Selecione a disciplina</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>

            {/* Cargo */}
            <div className="space-y-2">
              <Label>
                <Shield className="mr-1.5 inline h-3.5 w-3.5" />
                Cargo
              </Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-background/50 px-3 text-sm text-muted-foreground">
                {ROLE_LABELS[user.role] || user.role}
              </div>
              <p className="text-xs text-muted-foreground">
                O cargo é definido pelo administrador
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={savingProfile}
            >
              {savingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Alterações
                </>
              )}
            </Button>
          </div>
        </section>
      </form>

      {/* Change Password */}
      {passwordServerError && <FormAlert message={passwordServerError} />}
      {passwordSuccess && <FormAlert message={passwordSuccess} variant="success" />}

      {passwordChangeStep === 'form' ? (
        <form onSubmit={handleSubmitPassword(onChangePassword)}>
          <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Lock className="h-4 w-4 text-accent" />
              </div>
              <h2 className="text-base font-semibold">Alterar Palavra-passe</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Current Password */}
              <div className="space-y-2 sm:col-span-2 sm:max-w-sm">
                <Label htmlFor="currentPassword">Palavra-passe actual</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Insira a palavra-passe actual"
                    className="pr-10"
                    aria-invalid={!!passwordErrors.currentPassword}
                    {...registerPassword('currentPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormError message={passwordErrors.currentPassword?.message} />
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova palavra-passe</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                    aria-invalid={!!passwordErrors.newPassword}
                    {...registerPassword('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {(newPassword || passwordErrors.newPassword) && (
                  <div className={`space-y-1.5 rounded-lg border p-3 ${
                    passwordErrors.newPassword
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-border/40 bg-card/30'
                  }`}>
                    <p className={`text-xs font-medium ${passwordErrors.newPassword ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {passwordErrors.newPassword ? 'A palavra-passe não cumpre os requisitos:' : 'Requisitos da palavra-passe:'}
                    </p>
                    {[
                      { check: newPwHasMinLength, label: 'Pelo menos 8 caracteres' },
                      { check: newPwHasUppercase, label: 'Pelo menos uma letra maiúscula (A-Z)' },
                      { check: newPwHasNumber, label: 'Pelo menos um número (0-9)' },
                    ].map((rule, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {rule.check ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                        ) : (
                          <XCircle className={`h-3.5 w-3.5 shrink-0 ${passwordErrors.newPassword ? 'text-destructive' : 'text-muted-foreground/40'}`} />
                        )}
                        <span className={`text-xs ${
                          rule.check ? 'text-accent' : passwordErrors.newPassword ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
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
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a nova palavra-passe"
                  aria-invalid={!!passwordErrors.confirmPassword}
                  {...registerPassword('confirmPassword')}
                />
                <FormError message={passwordErrors.confirmPassword?.message} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                variant="outline"
                className="border-border/60"
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A enviar código...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Palavra-passe
                  </>
                )}
              </Button>
            </div>
          </section>
        </form>
      ) : (
        /* Verification Code Step */
        <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Mail className="h-4 w-4 text-accent" />
            </div>
            <h2 className="text-base font-semibold">Confirmar alteração de palavra-passe</h2>
          </div>

          <p className="mb-2 text-sm text-muted-foreground">
            Enviámos um código de verificação de 6 dígitos para o seu email.
            Introduza-o abaixo para confirmar a alteração.
          </p>

          {verifyError && <FormAlert message={verifyError} />}

          <div className="my-6 flex justify-center gap-2" onPaste={handleCodePaste}>
            {verifyCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { codeInputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                disabled={isVerifying}
                className="h-14 w-12 rounded-lg border-2 border-border bg-card text-center text-2xl font-bold text-foreground transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
                aria-label={`Dígito ${index + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBackToPasswordForm}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>

            <Button
              onClick={() => handleConfirmPasswordChange()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isVerifying || verifyCode.some(d => d === '')}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A verificar...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>

          <div className="mt-4 rounded-lg border border-border/40 bg-card/30 p-3">
            <p className="text-center text-xs text-muted-foreground">
              O código expira em <strong className="text-foreground">15 minutos</strong>.
              Verifique a pasta de spam se não encontrar o email.
            </p>
          </div>
        </section>
      )}

      {/* Danger Zone */}
      <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 sm:p-6">
        <h2 className="text-base font-semibold text-destructive">Zona de Perigo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Acções irreversíveis. Tenha cuidado.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Eliminar conta</p>
            <p className="text-xs text-muted-foreground">
              Todos os dados serão permanentemente eliminados, incluindo planos, dosificações e
              relatórios.
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
            Eliminar Conta
          </Button>
        </div>
      </section>
    </div>
  )
}
