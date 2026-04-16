'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, X, Clock, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { cn } from '@/src/shared/lib/utils'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'
import { useSubscription } from '@/src/ui/providers/subscription-provider'

interface PaymentModalProps {
  reference: string
  amount: number
  expiresAt: string
  onClose: () => void
  /** Called after successful code confirmation and context refresh */
  onSuccess?: () => void
}

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  )

  useEffect(() => {
    if (timeLeft <= 0) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1
        if (next <= 0) { clearInterval(id); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  const h = Math.floor(timeLeft / 3600)
  const m = Math.floor((timeLeft % 3600) / 60)
  const s = timeLeft % 60
  return { h, m, s, expired: timeLeft <= 0, urgent: h === 0 && m < 30 }
}

export function PaymentModal({ reference, amount, expiresAt, onClose, onSuccess }: PaymentModalProps) {
  const { refresh } = useSubscription()
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const { h, m, s, expired, urgent } = useCountdown(expiresAt)

  function copyReference() {
    navigator.clipboard.writeText(reference)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleConfirm() {
    const trimmedCode = code.trim()
    if (!trimmedCode || trimmedCode.length !== 4) {
      setConfirmError('O código deve ter exactamente 4 dígitos')
      return
    }
    setIsConfirming(true)
    setConfirmError('')
    try {
      const res = await fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_CONFIRM_BY_CODE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, code: trimmedCode }),
      })
      const data = await res.json()
      if (!data.success) {
        setConfirmError(data.error?.message || 'Código inválido. Tente novamente.')
        return
      }
      setConfirmed(true)
      await refresh()
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch {
      setConfirmError('Erro de ligação. Verifique a internet e tente novamente.')
    } finally {
      setIsConfirming(false)
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div className={cn(
        'relative w-full bg-card shadow-2xl animate-in',
        'sm:max-w-md sm:rounded-2xl sm:border sm:border-border/50',
        'rounded-t-2xl border-t border-border/50',
        'slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300',
      )}>
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="relative px-6 pb-0 pt-4 sm:pt-6">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-bold tracking-tight">Activar subscrição Premium</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique o seu email e introduza o código de 4 dígitos para activar a sua subscrição.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Amount */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Montante</p>
            <p className="mt-1 text-3xl font-bold text-accent tabular-nums">
              {amount.toLocaleString('pt-AO')} Kz
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Pagamento único por mês</p>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Referência de pagamento</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.25em]">
                {reference}
              </div>
              <button
                onClick={copyReference}
                className={cn(
                  'flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium transition-all duration-200',
                  copied
                    ? 'border-green-500/30 bg-green-500/10 text-green-500 scale-95'
                    : 'border-border/60 bg-secondary/50 text-muted-foreground hover:border-accent/40 hover:bg-accent/5 hover:text-accent hover:scale-105',
                )}
              >
                {copied
                  ? <><Check className="h-4 w-4" /><span>OK</span></>
                  : <><Copy className="h-4 w-4" /><span>Copiar</span></>
                }
              </button>
            </div>
          </div>

          {/* Countdown */}
          {!expired ? (
            <div className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm',
              urgent ? 'border border-yellow-500/20 bg-yellow-500/5' : 'border border-border/30 bg-secondary/30',
            )}>
              <Clock className={cn('h-3.5 w-3.5 shrink-0', urgent ? 'text-yellow-500' : 'text-muted-foreground')} />
              <span className="text-muted-foreground text-xs">Referência válida por</span>
              <span className={cn(
                'font-mono font-bold tabular-nums text-xs',
                urgent ? 'text-yellow-500' : 'text-foreground',
              )}>
                {pad(h)}:{pad(m)}:{pad(s)}
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
              Esta referência expirou. Feche e inicie um novo upgrade.
            </div>
          )}

          {/* Confirmation code input */}
          {!expired && !confirmed && (
            <div className="space-y-2 rounded-xl border border-border/40 bg-secondary/10 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Código de activação
              </p>
              <p className="text-xs text-muted-foreground">
                Enviámos um código de 4 dígitos para o seu email registado. Introduza-o abaixo para completar a activação.
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="_ _ _ _"
                value={code}
                onChange={e => {
                  setConfirmError('')
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                }}
                onKeyDown={e => { if (e.key === 'Enter' && code.length === 4) handleConfirm() }}
                className={cn(
                  'w-full rounded-lg border bg-background px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.5em] outline-none transition-colors',
                  confirmError
                    ? 'border-destructive/60 focus:border-destructive'
                    : 'border-border/60 focus:border-accent',
                )}
              />
              {confirmError && (
                <p className="text-xs text-destructive">{confirmError}</p>
              )}
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                onClick={handleConfirm}
                disabled={isConfirming || code.length !== 4}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    A confirmar...
                  </>
                ) : (
                  'Confirmar pagamento'
                )}
              </Button>
            </div>
          )}

          {/* Success state */}
          {confirmed && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-4 text-center">
              <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-green-500" />
              <p className="text-sm font-semibold text-green-500">Subscrição activada com sucesso!</p>
              <p className="mt-1 text-xs text-muted-foreground">A redirecionar...</p>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 px-6 py-4">
          <Button
            variant="outline"
            className="w-full transition-colors hover:bg-secondary"
            onClick={onClose}
          >
            Fechar — pagarei mais tarde
          </Button>
        </div>
      </div>
    </div>
  )
}
