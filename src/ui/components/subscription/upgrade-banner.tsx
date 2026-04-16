'use client'

import { useState, useEffect } from 'react'
import { X, Zap, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { cn } from '@/src/shared/lib/utils'
import { useSubscription } from '@/src/ui/providers/subscription-provider'

const DISMISS_KEY = 'upgrade_banner_dismissed_at'
const DISMISS_HOURS = 8 // re-show after 8h (limit warnings ignore this)

interface UpgradeBannerProps {
  onUpgradeClick: () => void
}

export function UpgradeBanner({ onUpgradeClick }: UpgradeBannerProps) {
  const { status, usage, isLoading } = useSubscription()
  const [visible, setVisible] = useState(false)

  const plan = status?.subscription?.plan ?? usage?.plan ?? 'FREE'
  const subStatus = status?.subscription?.status ?? 'ACTIVE'
  const remaining = usage?.remaining ?? null
  const isAtLimit = remaining !== null && remaining <= 0
  const isNearLimit = remaining !== null && remaining > 0 && remaining <= 2
  const isPending = subStatus === 'PENDING_PAYMENT'

  useEffect(() => {
    if (isLoading || plan !== 'FREE' || isPending) return

    // Limit warnings always show (high priority)
    if (isAtLimit || isNearLimit) {
      setVisible(true)
      return
    }

    // Normal promo banner: respect dismiss cooldown
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const diff = Date.now() - Number(dismissedAt)
      if (diff < DISMISS_HOURS * 60 * 60 * 1000) return
    }
    setVisible(true)
  }, [isLoading, plan, isPending, isAtLimit, isNearLimit])

  function dismiss() {
    setVisible(false)
    if (!isAtLimit && !isNearLimit) {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
  }

  if (!visible || plan !== 'FREE' || isPending) return null

  // ── At limit ──────────────────────────────────────────────────────────────
  if (isAtLimit) {
    return (
      <div className={cn(
        'flex items-center gap-3 border-b border-destructive/20 bg-destructive/8 px-4 py-2.5',
        'animate-in slide-in-from-top-2 duration-300',
      )}>
        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-sm font-semibold text-destructive">
            Atingiu o limite de planos deste mês.
          </span>
          <span className="text-xs text-muted-foreground">
            Faça upgrade agora e continue a criar planos sem interrupções.
          </span>
        </div>
        <Button
          size="sm"
          className="shrink-0 bg-destructive text-white hover:bg-destructive/90 transition-transform hover:scale-105"
          onClick={onUpgradeClick}
        >
          Desbloquear agora
        </Button>
        <button onClick={dismiss} className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // ── Near limit ────────────────────────────────────────────────────────────
  if (isNearLimit) {
    return (
      <div className={cn(
        'flex items-center gap-3 border-b border-yellow-500/20 bg-yellow-500/8 px-4 py-2.5',
        'animate-in slide-in-from-top-2 duration-300',
      )}>
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
            Só lhe restam {remaining} plano{remaining !== 1 ? 's' : ''} gratuitos este mês.
          </span>
          <span className="text-xs text-muted-foreground">
            Faça upgrade para continuar sem preocupações.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-yellow-500/40 text-yellow-600 hover:bg-yellow-500/10 dark:text-yellow-400 transition-transform hover:scale-105"
          onClick={onUpgradeClick}
        >
          Upgrade
        </Button>
        <button onClick={dismiss} className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // ── Default promo banner ───────────────────────────────────────────────────
  return (
    <div className={cn(
      'flex items-center gap-3 border-b border-accent/15 bg-accent/5 px-4 py-2.5',
      'animate-in slide-in-from-top-2 duration-300',
    )}>
      <Zap className="h-4 w-4 shrink-0 text-accent" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="text-sm font-medium">
          Desbloqueie o plano Premium
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Planos ilimitados · Exportação PDF/Word/Excel · Qualidade superior
        </span>
      </div>
      <Button
        size="sm"
        className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90 transition-transform hover:scale-105"
        onClick={onUpgradeClick}
      >
        Saber mais
      </Button>
      <button onClick={dismiss} className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
