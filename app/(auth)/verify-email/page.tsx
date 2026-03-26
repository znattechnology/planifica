'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/src/ui/components/ui/button'
import { FormAlert } from '@/src/ui/components/ui/form-error'
import { useAuth } from '@/src/ui/providers/auth-provider'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const verificationToken = searchParams.get('vt') || ''
  const email = searchParams.get('email') || ''
  const { verifyEmail, resendCode } = useAuth()

  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [serverError, setServerError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are filled
    const fullCode = newCode.join('')
    if (fullCode.length === 6 && newCode.every(d => d !== '')) {
      handleVerify(fullCode)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newCode = [...code]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ''
    }
    setCode(newCode)

    if (pasted.length === 6) {
      handleVerify(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  async function handleVerify(fullCode?: string) {
    const codeStr = fullCode || code.join('')
    if (codeStr.length !== 6) return

    setServerError('')
    setIsVerifying(true)
    try {
      await verifyEmail(verificationToken, codeStr)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Código inválido. Tente novamente.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleResend() {
    setServerError('')
    setResendSuccess(false)
    setIsResending(true)
    try {
      await resendCode(verificationToken)
      setResendSuccess(true)
      setCountdown(60)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao reenviar código')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Verificar o seu email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviámos um código de 6 dígitos para
        </p>
        {email && (
          <p className="mt-1 text-sm font-medium text-foreground">
            {email}
          </p>
        )}
      </div>

      {/* Error */}
      {serverError && <FormAlert message={serverError} />}

      {/* Success message for resend */}
      {resendSuccess && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-center text-sm text-accent">
          Novo código enviado com sucesso!
        </div>
      )}

      {/* Code Input */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isVerifying}
            className="h-14 w-12 rounded-lg border-2 border-border bg-card text-center text-2xl font-bold text-foreground transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
            aria-label={`Dígito ${index + 1}`}
          />
        ))}
      </div>

      {/* Verify Button */}
      <Button
        onClick={() => handleVerify()}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        disabled={isVerifying || code.some(d => d === '')}
      >
        {isVerifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            A verificar...
          </>
        ) : (
          'Verificar email'
        )}
      </Button>

      {/* Resend */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Não recebeu o código?
        </p>
        <button
          onClick={handleResend}
          disabled={isResending || countdown > 0}
          className="mt-1 text-sm font-medium text-accent hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {isResending ? (
            'A enviar...'
          ) : countdown > 0 ? (
            `Reenviar código (${countdown}s)`
          ) : (
            'Reenviar código'
          )}
        </button>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-border/40 bg-card/30 p-3">
        <p className="text-center text-xs text-muted-foreground">
          O código expira em <strong className="text-foreground">15 minutos</strong>.
          Verifique a pasta de spam se não encontrar o email.
        </p>
      </div>

      {/* Back to register */}
      <div className="text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao registo
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
