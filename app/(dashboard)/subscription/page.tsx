'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Star,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Calendar,
  Zap,
  Loader2,
  ArrowUpCircle,
  Infinity,
  FileDown,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { cn } from '@/src/shared/lib/utils'
import { useSubscription } from '@/src/ui/providers/subscription-provider'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'
import { PaymentModal } from '@/src/ui/components/subscription/payment-modal'

interface Payment {
  id: string
  reference: string
  amount: number
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED'
  source: string
  createdAt: string
  expiresAt: string
  confirmedAt: string | null
}

const PREMIUM_BENEFITS = [
  { icon: Infinity, label: 'Planos ilimitados todos os meses' },
  { icon: FileDown, label: 'Exportação PDF, Word e Excel' },
  { icon: Zap, label: 'Melhor qualidade nos planos gerados pela IA' },
  { icon: Star, label: 'Suporte prioritário' },
]

const PAYMENT_STATUS_CONFIG = {
  PENDING: { label: 'Pendente', className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500' },
  CONFIRMED: { label: 'Confirmado', className: 'border-green-500/30 bg-green-500/10 text-green-500' },
  EXPIRED: { label: 'Expirado', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
}

const SOURCE_LABELS: Record<string, string> = {
  UPGRADE_BUTTON: 'Botão Upgrade',
  LIMIT_REACHED: 'Limite Atingido',
  ADMIN: 'Admin',
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isNearLimit = pct >= 60
  const isAtLimit = pct >= 100
  const remaining = limit - used

  return (
    <div className="space-y-2">
      {isAtLimit ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2">
          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-xs font-medium text-destructive">
            Limite atingido — não é possível criar mais planos este mês.
          </p>
        </div>
      ) : isNearLimit ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-yellow-500/25 bg-yellow-500/8 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
          <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
            Atenção: resta{remaining !== 1 ? 'm' : ''} apenas {remaining} plano{remaining !== 1 ? 's' : ''} este mês.
          </p>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Planos gerados este mês</span>
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

export default function SubscriptionPage() {
  const { status, usage, isLoading, refresh } = useSubscription()
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')
  const [paymentModal, setPaymentModal] = useState<{
    reference: string; amount: number; expiresAt: string
  } | null>(null)

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true)
    try {
      const res = await fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_PAYMENTS)
      const data = await res.json()
      if (data.success) setPayments(data.data as Payment[])
    } catch {
      // ignore
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

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
      await fetchPayments()
    } catch {
      setUpgradeError('Sem ligação. Verifique a internet e tente novamente.')
    } finally {
      setIsUpgrading(false)
    }
  }

  const sub = status?.subscription
  const pending = status?.pendingPayment
  const plan = sub?.plan ?? usage?.plan ?? 'FREE'
  const subStatus = sub?.status ?? 'ACTIVE'
  const isPremium = plan === 'PREMIUM' && subStatus === 'ACTIVE'
  const isPending = subStatus === 'PENDING_PAYMENT'
  const isExpired = subStatus === 'EXPIRED'
  const daysRemaining = status?.daysRemaining

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">A minha subscrição</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gira o seu plano e histórico de pagamentos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refresh(); fetchPayments() }}>
          <RefreshCw className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      {/* ── Subscription Overview Card ── */}
      <div className={cn(
        'rounded-xl border p-5 space-y-5',
        isPremium ? 'border-accent/30 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent'
          : isPending ? 'border-yellow-500/30 bg-yellow-500/5'
          : isExpired ? 'border-destructive/30 bg-destructive/5'
          : 'border-border/40 bg-card/50',
      )}>
        {/* Plan header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isPremium ? 'bg-accent/20' : isPending ? 'bg-yellow-500/20' : isExpired ? 'bg-destructive/10' : 'bg-secondary',
            )}>
              {isPremium ? <Crown className="h-5 w-5 text-accent" />
                : isPending ? <Clock className="h-5 w-5 text-yellow-500" />
                : isExpired ? <AlertCircle className="h-5 w-5 text-destructive" />
                : <Sparkles className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <p className="font-semibold">
                {isPremium ? 'Plano Premium'
                  : isPending ? 'Pagamento pendente'
                  : isExpired ? 'Subscrição expirada'
                  : 'Plano Gratuito'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPremium ? 'Acesso completo desbloqueado'
                  : isPending ? 'Efectue o pagamento para activar o Premium'
                  : isExpired ? 'Renove para continuar a usar a plataforma'
                  : '5 planos por mês · Sem exportação'}
              </p>
            </div>
          </div>
          <Badge className={cn(
            'shrink-0',
            isPremium ? 'border-accent/30 bg-accent/10 text-accent'
              : isPending ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'
              : isExpired ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-secondary bg-secondary text-secondary-foreground',
          )}>
            {isPremium ? 'PREMIUM' : isPending ? 'PENDENTE' : isExpired ? 'EXPIRADO' : 'FREE'}
          </Badge>
        </div>

        {/* Dates */}
        {sub && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Início</p>
              <p className="text-sm font-semibold mt-0.5">
                {new Date(sub.startDate).toLocaleDateString('pt-AO')}
              </p>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fim</p>
              <p className="text-sm font-semibold mt-0.5">
                {new Date(sub.endDate).getFullYear() >= 2090
                  ? '∞ Sem limite'
                  : new Date(sub.endDate).toLocaleDateString('pt-AO')}
              </p>
            </div>
            {isPremium && daysRemaining != null && (
              <div className={cn(
                'rounded-lg border p-3',
                daysRemaining <= 7
                  ? 'border-yellow-500/30 bg-yellow-500/10'
                  : 'border-accent/30 bg-accent/10',
              )}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dias restantes</p>
                <p className={cn(
                  'text-2xl font-bold mt-0.5',
                  daysRemaining <= 7 ? 'text-yellow-500' : 'text-accent',
                )}>
                  {daysRemaining}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Usage bar (FREE only) */}
        {!isPremium && !isPending && usage && typeof usage.plansLimit === 'number' && (
          <UsageBar used={usage.plansUsed} limit={usage.plansLimit} />
        )}

        {/* Premium features list */}
        {isPremium && (
          <div className="space-y-1.5">
            {['Planos ilimitados', 'Exportação PDF, Word e Excel', 'Qualidade máxima com IA', 'Suporte prioritário'].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}

        {/* Pending payment reference */}
        {isPending && pending && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Referência Multicaixa</p>
              <p className="font-mono text-sm font-bold tracking-widest mt-0.5">{pending.reference}</p>
            </div>
            <p className="text-base font-bold text-yellow-500 shrink-0">{pending.amount.toLocaleString('pt-AO')} Kz</p>
          </div>
        )}

        {/* Benefits (FREE/EXPIRED) */}
        {!isPremium && !isPending && (
          <div className="space-y-2 rounded-lg border border-border/30 bg-secondary/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              O que vai desbloquear com Premium
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
          <p className="rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">{upgradeError}</p>
        )}

        {/* CTA */}
        {!isPremium && (
          <Button
            className={cn(
              'w-full font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]',
              isPending
                ? 'bg-yellow-500 text-white hover:bg-yellow-500/90'
                : isExpired
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : 'bg-accent text-accent-foreground hover:bg-accent/90',
            )}
            onClick={isPending && pending
              ? () => setPaymentModal({ reference: pending.reference, amount: pending.amount, expiresAt: pending.expiresAt })
              : handleUpgrade
            }
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                A preparar referência...
              </>
            ) : isPending ? (
              <>
                <CreditCard className="mr-2 h-3.5 w-3.5" />
                Ver instruções de pagamento
              </>
            ) : (
              <>
                <ArrowUpCircle className="mr-2 h-3.5 w-3.5" />
                {isExpired ? 'Renovar Premium' : 'Actualizar para Premium — 5.000 Kz/mês'}
              </>
            )}
          </Button>
        )}

        {!isPremium && (
          <p className="text-center text-[11px] text-muted-foreground">
            Pagamento único por mês · Sem compromissos · Cancele quando quiser
          </p>
        )}
      </div>

      {/* ── Usage Section (Premium) ── */}
      {isPremium && usage && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Utilização este mês</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
              <p className="text-2xl font-bold text-accent">{usage.plansUsed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Planos gerados</p>
            </div>
            <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
              <p className="text-2xl font-bold">∞</p>
              <p className="text-xs text-muted-foreground mt-0.5">Planos disponíveis</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment History ── */}
      <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/40 px-5 py-4">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Histórico de Pagamentos</h2>
        </div>

        {paymentsLoading ? (
          <div className="divide-y divide-border/30">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum pagamento registado.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px] gap-4 border-b border-border/40 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Referência</span>
              <span>Montante</span>
              <span>Estado</span>
              <span>Data</span>
            </div>
            <div className="divide-y divide-border/30">
              {payments.map(payment => {
                const cfg = PAYMENT_STATUS_CONFIG[payment.status]
                return (
                  <div
                    key={payment.id}
                    className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-[1fr_120px_100px_100px] sm:items-center sm:gap-4"
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold tracking-wider">{payment.reference}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {SOURCE_LABELS[payment.source] ?? payment.source}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">{payment.amount.toLocaleString('pt-AO')} Kz</span>
                    </div>
                    <div>
                      <Badge className={cn('text-[10px]', cfg.className)}>{cfg.label}</Badge>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString('pt-AO')}
                      </span>
                      {payment.confirmedAt && (
                        <p className="text-[10px] text-green-500 mt-0.5">
                          Conf. {new Date(payment.confirmedAt).toLocaleDateString('pt-AO')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          reference={paymentModal.reference}
          amount={paymentModal.amount}
          expiresAt={paymentModal.expiresAt}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </div>
  )
}
