'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Crown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Ban,
  XCircle as XCircleIcon,
  Eye,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { useAuth } from '@/src/ui/providers/auth-provider'
import { cn } from '@/src/shared/lib/utils'
import { SubscriptionDetailsModal } from '@/src/ui/components/subscription/subscription-details-modal'
import { ConfirmDialog } from '@/src/ui/components/ui/confirm-dialog'

interface Subscription {
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

interface SubscriptionPage {
  data: Subscription[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const PLAN_CONFIG: Record<string, { label: string; className: string; icon: typeof Crown }> = {
  FREE: {
    label: 'Gratuito',
    icon: Sparkles,
    className: 'border-secondary bg-secondary text-secondary-foreground',
  },
  PREMIUM: {
    label: 'Premium',
    icon: Crown,
    className: 'border-accent/30 bg-accent/10 text-accent',
  },
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  ACTIVE: {
    label: 'Activa',
    icon: CheckCircle2,
    className: 'border-green-500/30 bg-green-500/10 text-green-500',
  },
  EXPIRED: {
    label: 'Expirada',
    icon: AlertCircle,
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  PENDING_PAYMENT: {
    label: 'Pend. Pagam.',
    icon: Clock,
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
  },
  CANCELLED: {
    label: 'Cancelada',
    icon: Ban,
    className: 'border-border/50 bg-secondary/50 text-muted-foreground',
  },
}

type ActionType = 'activate' | 'expire' | 'cancel'

export default function AdminSubscriptionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [pageData, setPageData] = useState<SubscriptionPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<{ id: string; action: ActionType } | null>(null)
  const [actionError, setActionError] = useState('')
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [confirmPending, setConfirmPending] = useState<{ id: string; action: ActionType } | null>(null)

  const fetchSubscriptions = useCallback(async (page: number) => {
    setIsLoading(true)
    try {
      const res = await fetchWithAuth(`${API_ROUTES.ADMIN_SUBSCRIPTIONS}?page=${page}&limit=15`)
      const data = await res.json()
      if (data.success) setPageData(data.data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscriptions(currentPage)
  }, [fetchSubscriptions, currentPage])

  async function handleAction(subId: string, action: ActionType) {
    setActionLoading({ id: subId, action })
    setActionError('')
    try {
      const res = await fetchWithAuth(`${API_ROUTES.ADMIN_SUBSCRIPTIONS}/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!data.success) {
        setActionError(data.error?.message || 'Erro ao executar acção')
        return
      }
      await fetchSubscriptions(currentPage)
    } catch {
      setActionError('Erro de ligação. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  if (authLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive/50" />
        <h2 className="mt-4 text-lg font-semibold">Acesso Negado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Apenas administradores podem aceder a esta área.
        </p>
      </div>
    )
  }

  const premiumCount = pageData?.data.filter(s => s.plan === 'PREMIUM').length ?? 0
  const activeCount = pageData?.data.filter(s => s.status === 'ACTIVE').length ?? 0
  const pendingCount = pageData?.data.filter(s => s.status === 'PENDING_PAYMENT').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscrições</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerir subscrições de professores.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSubscriptions(currentPage)}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          <span className="ml-2 hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      {/* Error */}
      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Summary */}
      {pageData && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
            <p className="text-2xl font-bold">{pageData.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </div>
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
            <p className="text-2xl font-bold text-accent">{premiumCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Premium (pág.)</p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Activas (pág.)</p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Pendentes (pág.)</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden lg:grid grid-cols-[1fr_100px_140px_110px_110px_160px] gap-4 border-b border-border/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Utilizador</span>
          <span>Plano</span>
          <span>Estado</span>
          <span>Início</span>
          <span>Fim</span>
          <span className="text-right">Acções</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/30">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-32" />
              </div>
            ))}
          </div>
        ) : !pageData || pageData.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Crown className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma subscrição encontrada.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {pageData.data.map(sub => {
              const planCfg = PLAN_CONFIG[sub.plan]
              const statusCfg = STATUS_CONFIG[sub.status]
              const PlanIcon = planCfg.icon
              const StatusIcon = statusCfg.icon
              const now = new Date()
              const endDate = new Date(sub.endDate)
              const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000))
              const isSentinel = endDate.getFullYear() >= 2090
              const isActionLoading = actionLoading?.id === sub.id

              return (
                <div
                  key={sub.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1fr_100px_140px_110px_110px_160px] lg:items-center lg:gap-4"
                >
                  {/* User */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sub.userName ?? sub.userId.slice(0, 16) + '…'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {sub.userEmail ?? `ID: ${sub.id.slice(0, 8)}…`}
                    </p>
                  </div>

                  {/* Plan */}
                  <div>
                    <Badge className={cn('gap-1', planCfg.className)}>
                      <PlanIcon className="h-3 w-3" />
                      {planCfg.label}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div>
                    <Badge className={cn('gap-1', statusCfg.className)}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Start */}
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.startDate).toLocaleDateString('pt-AO')}
                    </span>
                  </div>

                  {/* End + days left */}
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {isSentinel ? '∞' : new Date(sub.endDate).toLocaleDateString('pt-AO')}
                    </span>
                    {sub.status === 'ACTIVE' && sub.plan === 'PREMIUM' && !isSentinel && (
                      <p className="text-[10px] text-accent">{daysLeft}d restantes</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {/* View details */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedSub(sub)}
                      title="Ver detalhes"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>

                    {/* Activate */}
                    {sub.status !== 'ACTIVE' && (
                      <Button
                        size="sm"
                        className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                        onClick={() => handleAction(sub.id, 'activate')}
                        disabled={isActionLoading}
                        title="Activar subscrição Premium por 30 dias"
                      >
                        {isActionLoading && actionLoading?.action === 'activate' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                    )}

                    {/* Expire */}
                    {sub.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10 dark:text-yellow-400 text-xs px-2"
                        onClick={() => setConfirmPending({ id: sub.id, action: 'expire' })}
                        disabled={isActionLoading}
                        title="Marcar como expirada"
                      >
                        {isActionLoading && actionLoading?.action === 'expire' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            Expirar
                          </>
                        )}
                      </Button>
                    )}

                    {/* Cancel */}
                    {sub.status !== 'EXPIRED' && sub.status !== 'CANCELLED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs px-2"
                        onClick={() => setConfirmPending({ id: sub.id, action: 'cancel' })}
                        disabled={isActionLoading}
                        title="Cancelar subscrição"
                      >
                        {isActionLoading && actionLoading?.action === 'cancel' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Ban className="h-3 w-3 mr-1" />
                            Cancelar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageData && pageData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {pageData.page} de {pageData.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= pageData.totalPages || isLoading}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selectedSub && (
        <SubscriptionDetailsModal
          subscription={selectedSub}
          onClose={() => setSelectedSub(null)}
        />
      )}

      {/* Confirmation dialog for destructive actions */}
      {confirmPending && (
        <ConfirmDialog
          title={confirmPending.action === 'cancel' ? 'Cancelar subscrição?' : 'Expirar subscrição?'}
          description={
            confirmPending.action === 'cancel'
              ? 'Esta acção marca a subscrição como cancelada. O utilizador perderá o acesso Premium imediatamente e não receberá uma nova subscrição gratuita automaticamente.'
              : 'Esta acção marca a subscrição como expirada. O utilizador receberá automaticamente uma subscrição gratuita.'
          }
          confirmLabel={confirmPending.action === 'cancel' ? 'Cancelar subscrição' : 'Expirar'}
          variant={confirmPending.action === 'cancel' ? 'destructive' : 'warning'}
          onConfirm={() => {
            const { id, action } = confirmPending
            setConfirmPending(null)
            handleAction(id, action)
          }}
          onCancel={() => setConfirmPending(null)}
        />
      )}
    </div>
  )
}
