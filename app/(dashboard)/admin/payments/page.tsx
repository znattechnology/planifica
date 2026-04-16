'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Send,
  Ban,
  Eye,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { useAuth } from '@/src/ui/providers/auth-provider'
import { cn } from '@/src/shared/lib/utils'
import { PaymentModal } from '@/src/ui/components/subscription/payment-modal'

interface Payment {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  subscriptionId: string
  reference: string
  amount: number
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED'
  source: string
  createdAt: string
  expiresAt: string
  confirmedAt: string | null
}

interface PaymentPage {
  data: Payment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
  },
  CONFIRMED: {
    label: 'Confirmado',
    icon: CheckCircle2,
    className: 'border-green-500/30 bg-green-500/10 text-green-500',
  },
  EXPIRED: {
    label: 'Expirado',
    icon: XCircle,
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
}

const SOURCE_LABELS: Record<string, string> = {
  UPGRADE_BUTTON: 'Upgrade',
  LIMIT_REACHED: 'Limite',
  ADMIN: 'Admin',
}

type PaymentAction = 'confirm' | 'expire' | 'resend'

export default function AdminPaymentsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [pageData, setPageData] = useState<PaymentPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<{ id: string; action: PaymentAction } | null>(null)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewPayment, setViewPayment] = useState<Payment | null>(null)

  const fetchPayments = useCallback(async (page: number) => {
    setIsLoading(true)
    try {
      const res = await fetchWithAuth(`${API_ROUTES.ADMIN_PAYMENTS}?page=${page}&limit=15`)
      const data = await res.json()
      if (data.success) setPageData(data.data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments(currentPage)
  }, [fetchPayments, currentPage])

  async function handleAction(paymentId: string, action: PaymentAction) {
    setActionLoading({ id: paymentId, action })
    setActionError('')
    setActionSuccess('')

    try {
      let res: Response
      if (action === 'confirm') {
        res = await fetchWithAuth(`${API_ROUTES.ADMIN_PAYMENTS}/${paymentId}/confirm`, { method: 'POST' })
      } else if (action === 'expire') {
        res = await fetchWithAuth(`${API_ROUTES.ADMIN_PAYMENTS}/${paymentId}/expire`, { method: 'POST' })
      } else {
        res = await fetchWithAuth(`${API_ROUTES.ADMIN_PAYMENTS}/${paymentId}/resend`, { method: 'POST' })
      }

      const data = await res.json()
      if (!data.success) {
        setActionError(data.error?.message || 'Erro ao executar acção')
        return
      }

      if (action === 'resend') {
        setActionSuccess('Email de referência reenviado com sucesso.')
        setTimeout(() => setActionSuccess(''), 4000)
      } else {
        await fetchPayments(currentPage)
      }
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
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-lg" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Pagamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirme, expire ou reenvie referências de pagamento.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPayments(currentPage)}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          <span className="ml-2 hidden sm:inline">Actualizar</span>
        </Button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          {actionSuccess}
        </div>
      )}

      {/* Summary badges */}
      {pageData && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">
            Total: <strong className="text-foreground">{pageData.total}</strong> pagamentos
          </span>
          {pageData.data.filter(p => p.status === 'PENDING').length > 0 && (
            <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
              {pageData.data.filter(p => p.status === 'PENDING').length} pendentes nesta página
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden xl:grid grid-cols-[1fr_130px_100px_90px_90px_200px] gap-4 border-b border-border/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Referência / Utilizador</span>
          <span>Montante</span>
          <span>Estado</span>
          <span>Origem</span>
          <span>Data</span>
          <span className="text-right">Acções</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border/30">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            ))}
          </div>
        ) : !pageData || pageData.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum pagamento encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {pageData.data.map(payment => {
              const cfg = STATUS_CONFIG[payment.status]
              const Icon = cfg.icon
              const isActionActive = actionLoading?.id === payment.id

              return (
                <div
                  key={payment.id}
                  className="grid grid-cols-1 gap-3 px-5 py-4 xl:grid-cols-[1fr_130px_100px_90px_90px_200px] xl:items-center xl:gap-4"
                >
                  {/* Reference + user */}
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold tracking-wider">{payment.reference}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {payment.userName ?? payment.userId.slice(0, 12) + '…'}
                      {payment.userEmail && (
                        <span className="ml-1 opacity-60">· {payment.userEmail}</span>
                      )}
                    </p>
                  </div>

                  {/* Amount */}
                  <div>
                    <span className="text-sm font-semibold">{payment.amount.toLocaleString('pt-AO')} Kz</span>
                  </div>

                  {/* Status */}
                  <div>
                    <Badge className={cn('gap-1', cfg.className)}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Source */}
                  <div>
                    <span className="text-xs text-muted-foreground">{SOURCE_LABELS[payment.source] ?? payment.source}</span>
                  </div>

                  {/* Date */}
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(payment.createdAt).toLocaleDateString('pt-AO')}
                    </span>
                    {payment.confirmedAt && (
                      <p className="text-[10px] text-green-500">
                        Conf. {new Date(payment.confirmedAt).toLocaleDateString('pt-AO')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {/* View reference */}
                    {payment.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setViewPayment(payment)}
                        title="Ver referência"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Confirm */}
                    {payment.status === 'PENDING' && (
                      <Button
                        size="sm"
                        className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs px-2"
                        onClick={() => handleAction(payment.id, 'confirm')}
                        disabled={isActionActive}
                        title="Confirmar pagamento e activar subscrição"
                      >
                        {isActionActive && actionLoading?.action === 'confirm' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Confirmar
                          </>
                        )}
                      </Button>
                    )}

                    {/* Expire */}
                    {payment.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10 dark:text-yellow-400 text-xs px-2"
                        onClick={() => handleAction(payment.id, 'expire')}
                        disabled={isActionActive}
                        title="Marcar como expirado"
                      >
                        {isActionActive && actionLoading?.action === 'expire' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Ban className="h-3 w-3 mr-1" />
                            Expirar
                          </>
                        )}
                      </Button>
                    )}

                    {/* Resend reference email */}
                    {payment.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-accent/40 text-accent hover:bg-accent/10 text-xs px-2"
                        onClick={() => handleAction(payment.id, 'resend')}
                        disabled={isActionActive}
                        title="Reenviar referência por email ao professor"
                      >
                        {isActionActive && actionLoading?.action === 'resend' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Reenviar
                          </>
                        )}
                      </Button>
                    )}

                    {/* Status label (for non-pending) */}
                    {payment.status !== 'PENDING' && (
                      <span className="text-xs text-muted-foreground italic">
                        {payment.status === 'CONFIRMED' ? 'Confirmado' : 'Expirado'}
                      </span>
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

      {/* View reference modal */}
      {viewPayment && (
        <PaymentModal
          reference={viewPayment.reference}
          amount={viewPayment.amount}
          expiresAt={viewPayment.expiresAt}
          onClose={() => setViewPayment(null)}
        />
      )}
    </div>
  )
}
