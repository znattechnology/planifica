'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/src/shared/lib/utils'
import { useSubscription } from '@/src/ui/providers/subscription-provider'
import { PaymentModal } from './payment-modal'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

interface LockedFeatureButtonProps {
  children: React.ReactNode
  /** Tooltip shown on hover */
  tooltip?: string
  className?: string
}

/**
 * Wraps any button/element that is locked for FREE users.
 * Shows a lock overlay + tooltip and opens the upgrade flow on click.
 */
export function LockedFeatureButton({
  children,
  tooltip = 'Disponível no plano Premium',
  className,
}: LockedFeatureButtonProps) {
  const { status, usage } = useSubscription()
  const [showTooltip, setShowTooltip] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{
    reference: string; amount: number; expiresAt: string
  } | null>(null)

  const plan = status?.subscription?.plan ?? usage?.plan ?? 'FREE'
  const isPremium = plan === 'PREMIUM' && status?.subscription?.status === 'ACTIVE'

  // Premium users get the real button
  if (isPremium) return <>{children}</>

  async function handleClick() {
    try {
      const res = await fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_UPGRADE, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const { payment } = data.data as { payment: { reference: string; amount: number; expiresAt: string } }
        setPaymentModal({ reference: payment.reference, amount: payment.amount, expiresAt: payment.expiresAt })
      }
    } catch {
      // ignore — user can still see the upgrade flow from the subscription card
    }
  }

  return (
    <>
      <div
        className={cn('relative group inline-flex', className)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Disabled overlay */}
        <div
          className="cursor-pointer select-none opacity-50 pointer-events-none"
          aria-disabled="true"
        >
          {children}
        </div>

        {/* Lock badge */}
        <div
          className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-md transition-opacity"
          onClick={handleClick}
        >
          <div className="flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all group-hover:bg-accent/10 group-hover:text-accent">
            <Lock className="h-3 w-3" />
            Premium
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border/50 bg-popover px-3 py-1.5 text-xs shadow-lg">
            {tooltip}
          </div>
        )}
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
