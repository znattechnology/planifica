'use client'

import { useState } from 'react'
import { Wand2, ShieldCheck, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'

interface Props {
  planId: string
  initialValue: boolean
  onToggle?: (newValue: boolean) => void
}

export function AutoAdjustToggle({ planId, initialValue, onToggle }: Props) {
  const [enabled, setEnabled] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const newValue = !enabled
    setSaving(true)
    try {
      const res = await fetchWithAuth(API_ROUTES.PLANS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, allowAutoAdjustments: newValue }),
      })
      if (res.ok) {
        setEnabled(newValue)
        onToggle?.(newValue)
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        enabled
          ? 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20'
          : 'border-border/60 bg-secondary text-muted-foreground hover:bg-secondary/80'
      }`}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : enabled ? (
        <Wand2 className="h-3.5 w-3.5" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" />
      )}
      {enabled ? 'Ajustes automáticos: Ligado' : 'Ajustes automáticos: Desligado'}
    </button>
  )
}
