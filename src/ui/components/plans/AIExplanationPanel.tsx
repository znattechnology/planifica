'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  GitBranch,
  CalendarDays,
  History,
  AlertTriangle,
  Scale,
  Copy,
} from 'lucide-react'
import { Badge } from '@/src/ui/components/ui/badge'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

interface ExplanationFactor {
  id: string
  label: string
  active: boolean
  detail?: string
}

interface PlanExplanation {
  explanation: string
  factors: ExplanationFactor[]
}

interface Props {
  planId: string
}

const FACTOR_ICONS: Record<string, typeof Brain> = {
  parent_plan: GitBranch,
  school_calendar: CalendarDays,
  teaching_history: History,
  difficulty_detection: AlertTriangle,
  workload_balance: Scale,
  sibling_awareness: Copy,
}

const FACTOR_COLORS: Record<string, { active: string; icon: string }> = {
  parent_plan: { active: 'border-blue-500/30 bg-blue-500/5', icon: 'text-blue-500 bg-blue-500/10' },
  school_calendar: { active: 'border-purple-500/30 bg-purple-500/5', icon: 'text-purple-500 bg-purple-500/10' },
  teaching_history: { active: 'border-amber-500/30 bg-amber-500/5', icon: 'text-amber-500 bg-amber-500/10' },
  difficulty_detection: { active: 'border-red-400/30 bg-red-400/5', icon: 'text-red-400 bg-red-400/10' },
  workload_balance: { active: 'border-green-500/30 bg-green-500/5', icon: 'text-green-500 bg-green-500/10' },
  sibling_awareness: { active: 'border-cyan-500/30 bg-cyan-500/5', icon: 'text-cyan-500 bg-cyan-500/10' },
}

function ExplanationSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-44" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function AIExplanationPanel({ planId }: Props) {
  const [data, setData] = useState<PlanExplanation | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null)
  const [error, setError] = useState(false)

  async function fetchExplanation() {
    if (data) {
      setExpanded(!expanded)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const res = await fetchWithAuth(`/api/plans/explanation?planId=${planId}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        setExpanded(true)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
      <button
        onClick={fetchExplanation}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold">Como a IA criou este plano</span>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 px-5 pb-5 pt-4 space-y-4">
              {/* Explanation text */}
              <p className="text-sm leading-relaxed">{data.explanation}</p>

              {/* Interactive factors */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Clique num factor para ver detalhes
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.factors.map((factor) => {
                    const Icon = FACTOR_ICONS[factor.id] || Brain
                    const colors = FACTOR_COLORS[factor.id]
                    const isFactorExpanded = expandedFactor === factor.id

                    return (
                      <button
                        key={factor.id}
                        onClick={() => setExpandedFactor(isFactorExpanded ? null : factor.id)}
                        className={`text-left rounded-lg border p-3 transition-all ${
                          factor.active
                            ? isFactorExpanded
                              ? `${colors?.active || 'border-accent/30 bg-accent/5'} ring-1 ring-accent/20`
                              : `${colors?.active || 'border-accent/30 bg-accent/5'} hover:ring-1 hover:ring-accent/10`
                            : 'border-border/30 bg-background/50 opacity-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            factor.active
                              ? colors?.icon || 'text-accent bg-accent/10'
                              : 'text-muted-foreground bg-secondary'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{factor.label}</span>
                              {factor.active ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                            </div>

                            <AnimatePresence>
                              {isFactorExpanded && factor.detail && (
                                <motion.p
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="mt-1.5 text-xs text-muted-foreground leading-relaxed overflow-hidden"
                                >
                                  {factor.detail}
                                </motion.p>
                              )}
                            </AnimatePresence>

                            {!isFactorExpanded && factor.active && (
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                Clique para ver detalhes
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="border-t border-border/40 px-5 pb-4 pt-3">
          <p className="text-xs text-muted-foreground">
            Não foi possível carregar a explicação. Tente novamente.
          </p>
        </div>
      )}
    </div>
  )
}
