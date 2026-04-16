'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  id: string
  plan: 'FREE' | 'PREMIUM'
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING_PAYMENT'
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface PendingPaymentInfo {
  id: string
  reference: string
  amount: number
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED'
  source: string
  expiresAt: string
  createdAt: string
}

export interface SubscriptionStatus {
  subscription: SubscriptionInfo | null
  pendingPayment: PendingPaymentInfo | null
  daysRemaining: number | null
}

export interface SubscriptionUsage {
  plan: 'FREE' | 'PREMIUM'
  plansUsed: number
  plansLimit: number | null
  remaining: number | null
}

interface SubscriptionContextValue {
  status: SubscriptionStatus | null
  usage: SubscriptionUsage | null
  isLoading: boolean
  refresh: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [statusRes, usageRes] = await Promise.all([
        fetchWithAuth(API_ROUTES.SUBSCRIPTIONS),
        fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_USAGE),
      ])
      const [statusData, usageData] = await Promise.all([
        statusRes.json(),
        usageRes.json(),
      ])
      if (statusData.success) setStatus(statusData.data as SubscriptionStatus)
      if (usageData.success) setUsage(usageData.data as SubscriptionUsage)
    } catch {
      // silently ignore — subscription is non-critical UI
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SubscriptionContext.Provider value={{ status, usage, isLoading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be inside SubscriptionProvider')
  return ctx
}
