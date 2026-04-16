'use client'

import { useState } from 'react'
import {
  Star,
  Clock,
  AlertCircle,
  Loader2,
  ArrowUpCircle,
  CheckCircle2,
  RefreshCw,
  FileDown,
  Infinity,
  Zap,
  AlertTriangle,
  XCircle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { cn } from '@/src/shared/lib/utils'
import { useSubscription } from '@/src/ui/providers/subscription-provider'
import { PaymentModal } from './payment-modal'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

// ─── Benefits unlocked with Premium ───────────────────────────────────────────

const PREMIUM_BENEFITS = [
  { icon: Infinity, label: 'Planos ilimitados todos os meses' },
  { icon: FileDown, label: 'Exportação PDF, Word e Excel' },
  { icon: Zap,      label: 'Melhor qualidade nos planos gerados' },
  { icon: Star,     label: 'Suporte prioritário' },
]

// ─── Usage bar ────────────────────────────────────────────────────────────────

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isNearLimit = pct >= 60
  const isAtLimit = pct >= 100
  const remaining = limit - used

  return (
    <div className="space-y-2">
      {/* Warning pill */}
      {isAtLimit ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2">
          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-xs font-medium text-destructive">
            Limite atingido — não é possível criar mais planos este mês.
          </p>
        </div>
      ) : isNearLimit ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-yellow-500/25 bg-yellow-500/8 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
          <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
            Atenção: resta{remaining !== 1 ? 'm' : ''} apenas {remaining} plano{remaining !== 1 ? 's' : ''} este mês.
          </p>
        </div>
      ) : null}

      {/* Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Planos usados este mês</span>
          <span className={cn(
            'font-semibold tabular-nums',
            isAtLimit ? 'text-destructive' : isNearLimit ? 'text-yellow-500' : 'text-foreground',
          )}>
            {used} / {limit}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-yellow-500' : 'bg-accent',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function SubscriptionCard() {
  const { status, usage, isLoading, refresh } = useSubscription()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')
  const [paymentModal, setPaymentModal] = useState<{
    reference: string
    amount: number
    expiresAt: string
  } | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [confirmSuccess, setConfirmSuccess] = useState(false)

  async function handleUpgrade() {
    setIsUpgrading(true)
    setUpgradeError('')
    try {
      const res = await fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_UPGRADE, { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        setUpgradeError(data.error?.message || 'Erro ao iniciar upgrade. Tente novamente.')
        return
      }
      const { payment } = data.data as { payment: { reference: string; amount: number; expiresAt: string } }
      setPaymentModal({ reference: payment.reference, amount: payment.amount, expiresAt: payment.expiresAt })
      await refresh()
    } catch {
      setUpgradeError('Sem ligação. Verifique a internet e tente novamente.')
    } finally {
      setIsUpgrading(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    )
  }

  const sub = status?.subscription
  const pending = status?.pendingPayment
  const plan = sub?.plan ?? usage?.plan ?? 'FREE'
  const subStatus = sub?.status ?? 'ACTIVE'
  const isAtLimit = (usage?.remaining ?? 1) <= 0

  // ── PENDING_PAYMENT ────────────────────────────────────────────────────────
  if (subStatus === 'PENDING_PAYMENT' && pending && pending.status === 'PENDING') {
    const pendingPayment = pending // capture for closures — TypeScript narrowing
    async function handleConfirmCode() {
      const trimmed = confirmCode.trim()
      if (trimmed.length !== 4) {
        setConfirmError('O código deve ter exactamente 4 dígitos')
        return
      }
      setIsConfirming(true)
      setConfirmError('')
      try {
        const res = await fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_CONFIRM_BY_CODE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: pendingPayment.reference, code: trimmed }),
        })
        const data = await res.json()
        if (!data.success) {
          setConfirmError(data.error?.message || 'Código inválido. Tente novamente.')
          return
        }
        setConfirmSuccess(true)
        await refresh()
      } catch {
        setConfirmError('Erro de ligação. Verifique a internet e tente novamente.')
      } finally {
        setIsConfirming(false)
      }
    }

    return (
      <>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 space-y-4 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/20">
                {confirmSuccess
                  ? <ShieldCheck className="h-4 w-4 text-green-500" />
                  : <Clock className="h-4 w-4 text-yellow-500" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {confirmSuccess ? 'Pagamento confirmado!' : 'Pagamento pendente'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {confirmSuccess
                    ? 'A activar a sua subscrição Premium...'
                    : 'Verifique o seu email para o código de activação'
                  }
                </p>
              </div>
            </div>
            <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500 shrink-0">
              PENDENTE
            </Badge>
          </div>

          {!confirmSuccess && (
            <>
              {/* Reference + amount */}
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Referência</p>
                  <p className="font-mono text-sm font-bold tracking-widest mt-0.5">{pendingPayment.reference}</p>
                </div>
                <p className="text-base font-bold text-yellow-500">{pendingPayment.amount.toLocaleString('pt-AO')} Kz</p>
              </div>

              {/* Code input */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Código de activação
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enviámos um código de 4 dígitos para o seu email. Introduza-o aqui para activar a subscrição Premium.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="_ _ _ _"
                    value={confirmCode}
                    onChange={e => {
                      setConfirmError('')
                      setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && confirmCode.length === 4) handleConfirmCode() }}
                    className={cn(
                      'flex-1 rounded-lg border bg-background px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.4em] outline-none transition-colors',
                      confirmError
                        ? 'border-destructive/60 focus:border-destructive'
                        : 'border-border/60 focus:border-accent',
                    )}
                  />
                  <Button
                    size="sm"
                    className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90 px-4"
                    onClick={handleConfirmCode}
                    disabled={isConfirming || confirmCode.length !== 4}
                  >
                    {isConfirming
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : 'Confirmar'
                    }
                  </Button>
                </div>
                {confirmError && (
                  <p className="text-xs text-destructive">{confirmError}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 text-xs"
                  onClick={() => setPaymentModal({
                    reference: pendingPayment.reference,
                    amount: pendingPayment.amount,
                    expiresAt: pendingPayment.expiresAt,
                  })}
                >
                  Ver detalhes
                </Button>
                <Button size="sm" variant="ghost" className="px-2.5" onClick={refresh} title="Actualizar estado">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>

        {paymentModal && (
          <PaymentModal
            reference={paymentModal.reference}
            amount={paymentModal.amount}
            expiresAt={paymentModal.expiresAt}
            onClose={() => setPaymentModal(null)}
            onSuccess={() => setConfirmSuccess(true)}
          />
        )}
      </>
    )
  }

  // ── PREMIUM ACTIVE ─────────────────────────────────────────────────────────
  if (plan === 'PREMIUM' && subStatus === 'ACTIVE') {
    const days = status?.daysRemaining
    const isExpiringSoon = days !== null && days !== undefined && days <= 7

    return (
      <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-5 space-y-4 animate-in fade-in duration-300">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
              <Star className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold">Plano Premium</p>
              <p className="text-xs text-muted-foreground">Acesso completo desbloqueado</p>
            </div>
          </div>
          <Badge variant="accent" className="shrink-0">PREMIUM</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            'rounded-lg px-3 py-2.5 text-center',
            isExpiringSoon ? 'bg-yellow-500/10' : 'bg-accent/10',
          )}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dias restantes</p>
            <p className={cn(
              'text-2xl font-bold mt-0.5',
              isExpiringSoon ? 'text-yellow-500' : 'text-accent',
            )}>
              {days ?? '–'}
            </p>
            {isExpiringSoon && (
              <p className="text-[10px] text-yellow-500 mt-0.5">A renovar em breve</p>
            )}
          </div>
          <div className="rounded-lg bg-accent/10 px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Planos gerados</p>
            <p className="text-2xl font-bold text-accent mt-0.5">{usage?.plansUsed ?? '–'}</p>
          </div>
        </div>

        <div className="space-y-1.5 pt-1">
          {['Planos ilimitados', 'Exportação PDF, Word e Excel', 'Qualidade máxima com IA', 'Suporte prioritário'].map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── FREE (or EXPIRED) ──────────────────────────────────────────────────────
  const isExpired = subStatus === 'EXPIRED'

  return (
    <>
      <div className={cn(
        'rounded-xl border p-5 space-y-4 animate-in fade-in duration-300',
        isExpired
          ? 'border-destructive/30 bg-destructive/5'
          : isAtLimit
          ? 'border-destructive/20 bg-card/50'
          : 'border-border/40 bg-card/50',
      )}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              isExpired ? 'bg-destructive/10' : 'bg-secondary',
            )}>
              {isExpired
                ? <AlertCircle className="h-4 w-4 text-destructive" />
                : <Zap className="h-4 w-4 text-muted-foreground" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isExpired ? 'Subscrição Expirada' : 'Plano Gratuito'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isExpired
                  ? 'Renove para continuar a usar a plataforma'
                  : '5 planos por mês · Sem exportação'}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">FREE</Badge>
        </div>

        {/* Usage bar */}
        {!isExpired && usage && typeof usage.plansLimit === 'number' && (
          <UsageBar used={usage.plansUsed} limit={usage.plansLimit} />
        )}

        {/* Benefits unlock section */}
        {!isExpired && (
          <div className="space-y-2 rounded-lg border border-border/30 bg-secondary/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              O que vai desbloquear
            </p>
            <div className="space-y-1.5">
              {PREMIUM_BENEFITS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-accent/15">
                    <Icon className="h-2.5 w-2.5 text-accent" />
                  </div>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {upgradeError && (
          <p className="rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {upgradeError}
          </p>
        )}

        {/* CTA */}
        <Button
          className={cn(
            'w-full font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]',
            isAtLimit || isExpired
              ? 'bg-destructive text-white hover:bg-destructive/90'
              : 'bg-accent text-accent-foreground hover:bg-accent/90',
          )}
          onClick={handleUpgrade}
          disabled={isUpgrading}
        >
          {isUpgrading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              A preparar referência...
            </>
          ) : isAtLimit ? (
            <>
              <ArrowUpCircle className="mr-2 h-3.5 w-3.5" />
              Desbloquear Premium agora
            </>
          ) : (
            <>
              <ArrowUpCircle className="mr-2 h-3.5 w-3.5" />
              Tornar-se Premium — 5.000 Kz/mês
            </>
          )}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground">
          Pagamento único por mês · Sem compromissos
        </p>
      </div>

      {paymentModal && (
        <PaymentModal
          reference={paymentModal.reference}
          amount={paymentModal.amount}
          expiresAt={paymentModal.expiresAt}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </>
  )
}
