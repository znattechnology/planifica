'use client'

import { useState, useCallback } from 'react'
import { useSubscription } from '@/src/ui/providers/subscription-provider'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

export function useUpgradeGuard() {
  const { status } = useSubscription()
  const [modal, setModal] = useState<{
    reference: string
    amount: number
    expiresAt: string
  } | null>(null)

  const isPremium =
    status?.subscription?.plan === 'PREMIUM' &&
    status?.subscription?.status === 'ACTIVE'

  const guard = useCallback(
    (fn: () => void): (() => void) => {
      if (isPremium) {
        // PREMIUM users: call export directly.
        // The backend (ReportController, validate-export) is the source of truth —
        // it will reject with 403 if the subscription has since lapsed.
        return fn
      }

      // FREE user — intercept and trigger upgrade flow instead
      return async () => {
        try {
          const res = await fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_UPGRADE, { method: 'POST' })
          const data = await res.json()
          if (data.success) setModal(data.data.payment)
        } catch {
          // ignore — user can upgrade from the subscription page
        }
      }
    },
    [isPremium],
  )

  return {
    guard,
    isPremium,
    upgradeModal: modal,
    closeUpgradeModal: () => setModal(null),
  }
}
