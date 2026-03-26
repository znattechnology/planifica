'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Clock,
  RefreshCw,
  SkipForward,
  Scale,
  Loader2,
} from 'lucide-react'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

interface AdaptationChange {
  type: 'pacing' | 'reinforcement' | 'skipped' | 'calendar' | 'workload'
  message: string
}

interface Props {
  planId: string
}

const ICON_MAP = {
  pacing: Clock,
  reinforcement: RefreshCw,
  skipped: SkipForward,
  calendar: Clock,
  workload: Scale,
}

const COLOR_MAP = {
  pacing: { icon: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  reinforcement: { icon: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  skipped: { icon: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  calendar: { icon: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  workload: { icon: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
}

function AdaptationSkeleton() {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-border/30 bg-background/50 p-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function AdaptationInsights({ planId }: Props) {
  const [changes, setChanges] = useState<AdaptationChange[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAdaptations, setHasAdaptations] = useState(false)

  useEffect(() => {
    async function fetchAdaptations() {
      try {
        const res = await fetchWithAuth(`/api/plans/adaptations?planId=${planId}`)
        const data = await res.json()
        if (data.success && data.data) {
          setChanges(data.data.changes || [])
          setHasAdaptations(data.data.hasAdaptations || false)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchAdaptations()
  }, [planId])

  if (loading) return <AdaptationSkeleton />
  if (!hasAdaptations || changes.length === 0) return null

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold">A IA adaptou este plano</h2>
        <span className="ml-auto rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
          {changes.length} ajuste{changes.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
        Com base no seu histórico de aulas e no calendário escolar, a IA fez os seguintes ajustes para que este plano seja mais realista:
      </p>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-2.5"
      >
        {changes.map((change, i) => {
          const Icon = ICON_MAP[change.type] || Zap
          const colors = COLOR_MAP[change.type] || { icon: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' }

          return (
            <motion.div
              key={i}
              variants={staggerItem}
              className={`flex items-start gap-3 rounded-lg border ${colors.border} bg-background/50 p-3`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
                <Icon className={`h-4 w-4 ${colors.icon}`} />
              </div>
              <p className="text-sm leading-relaxed pt-1">{change.message}</p>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
