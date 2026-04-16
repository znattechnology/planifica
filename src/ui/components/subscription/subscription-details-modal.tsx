'use client'

import { X, Crown, Sparkles, CheckCircle2, AlertCircle, Clock, CreditCard, Calendar, Ban } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { cn } from '@/src/shared/lib/utils'

interface SubscriptionDetail {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  plan: 'FREE' | 'PREMIUM'
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING_PAYMENT' | 'CANCELLED'
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

interface PaymentDetail {
  id: string
  reference: string
  amount: number
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED'
  source: string
  createdAt: string
  expiresAt: string
  confirmedAt: string | null
}

interface SubscriptionDetailsModalProps {
  subscription: SubscriptionDetail
  payments?: PaymentDetail[]
  onClose: () => void
}

const PLAN_CONFIG = {
  FREE: { label: 'Gratuito', icon: Sparkles, className: 'border-secondary bg-secondary text-secondary-foreground' },
  PREMIUM: { label: 'Premium', icon: Crown, className: 'border-accent/30 bg-accent/10 text-accent' },
}

const STATUS_CONFIG = {
  ACTIVE: { label: 'Activa', icon: CheckCircle2, className: 'border-green-500/30 bg-green-500/10 text-green-500' },
  EXPIRED: { label: 'Expirada', icon: AlertCircle, className: 'border-destructive/30 bg-destructive/10 text-destructive' },
  PENDING_PAYMENT: { label: 'Pend. Pagamento', icon: Clock, className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500' },
  CANCELLED: { label: 'Cancelada', icon: Ban, className: 'border-border/50 bg-secondary/50 text-muted-foreground' },
}

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

export function SubscriptionDetailsModal({ subscription, payments = [], onClose }: SubscriptionDetailsModalProps) {
  const plan = PLAN_CONFIG[subscription.plan]
  const status = STATUS_CONFIG[subscription.status]
  const PlanIcon = plan.icon
  const StatusIcon = status.icon

  const now = new Date()
  const endDate = new Date(subscription.endDate)
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000))
  const isPremium = subscription.plan === 'PREMIUM'
  const isSentinel = endDate.getFullYear() >= 2090

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full bg-card shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 rounded-t-2xl border-t border-border/50 sm:max-w-lg sm:rounded-2xl sm:border">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', isPremium ? 'bg-accent/20' : 'bg-secondary')}>
              <PlanIcon className={cn('h-4 w-4', isPremium ? 'text-accent' : 'text-muted-foreground')} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Detalhes da Subscrição</h2>
              {subscription.userName && (
                <p className="text-xs text-muted-foreground">{subscription.userName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5 max-h-[70vh] overflow-y-auto">
          {/* User info */}
          {(subscription.userName || subscription.userEmail) && (
            <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Utilizador</p>
              {subscription.userName && <p className="text-sm font-medium">{subscription.userName}</p>}
              {subscription.userEmail && <p className="text-xs text-muted-foreground">{subscription.userEmail}</p>}
            </div>
          )}

          {/* Plan & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano</p>
              <Badge className={cn('gap-1', plan.className)}>
                <PlanIcon className="h-3 w-3" />
                {plan.label}
              </Badge>
            </div>
            <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
              <Badge className={cn('gap-1', status.className)}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Período
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Início</p>
                <p className="text-sm font-medium mt-0.5">
                  {new Date(subscription.startDate).toLocaleDateString('pt-AO')}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fim</p>
                <p className="text-sm font-medium mt-0.5">
                  {isSentinel ? 'Sem limite' : new Date(subscription.endDate).toLocaleDateString('pt-AO')}
                </p>
              </div>
            </div>
            {isPremium && !isSentinel && subscription.status === 'ACTIVE' && (
              <div className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium text-center',
                daysLeft <= 7 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 'bg-accent/10 text-accent',
              )}>
                {daysLeft} dias restantes
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="uppercase tracking-wide font-semibold">Criado em</p>
              <p className="mt-0.5">{new Date(subscription.createdAt).toLocaleDateString('pt-AO')}</p>
            </div>
            <div>
              <p className="uppercase tracking-wide font-semibold">ID</p>
              <p className="mt-0.5 font-mono">{subscription.id.slice(0, 8)}…</p>
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Histórico de Pagamentos
              </p>
              <div className="space-y-2">
                {payments.map(payment => {
                  const pStatus = PAYMENT_STATUS_CONFIG[payment.status]
                  return (
                    <div
                      key={payment.id}
                      className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold tracking-wider">{payment.reference}</span>
                        <Badge className={cn('text-[10px]', pStatus.className)}>{pStatus.label}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{payment.amount.toLocaleString('pt-AO')} Kz</span>
                        <span>{new Date(payment.createdAt).toLocaleDateString('pt-AO')}</span>
                      </div>
                      {payment.confirmedAt && (
                        <p className="text-[10px] text-green-500">
                          Confirmado em {new Date(payment.confirmedAt).toLocaleDateString('pt-AO')}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Origem: {SOURCE_LABELS[payment.source] ?? payment.source}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 px-6 py-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
