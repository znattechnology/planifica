'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, CheckCircle2, Clock, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/src/ui/components/ui/badge'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

interface TimelineWeek {
  week: string
  period?: string
  unit: string
  objectives: string
  contents: string
  numLessons: number
  status: 'completed' | 'partial' | 'pending' | 'skipped'
  lessonCount: { total: number; delivered: number; partial: number; skipped: number }
}

interface TimelineData {
  planId: string
  planTitle: string
  trimester?: number
  totalWeeks: number
  completedWeeks: number
  progressPercent: number
  weeks: TimelineWeek[]
}

interface Props {
  planId: string
}

const STATUS_CONFIG = {
  completed: {
    label: 'Concluída',
    icon: CheckCircle2,
    dotColor: 'bg-green-500',
    badgeClass: 'bg-green-500/10 text-green-500',
    ringColor: 'ring-green-500/30',
    description: 'Todas as aulas desta semana foram dadas com sucesso.',
  },
  partial: {
    label: 'Parcial',
    icon: AlertTriangle,
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-500',
    ringColor: 'ring-amber-500/30',
    description: 'Algumas aulas não foram totalmente concluídas. A IA terá isto em conta.',
  },
  pending: {
    label: 'Pendente',
    icon: Clock,
    dotColor: 'bg-muted-foreground/40',
    badgeClass: 'bg-secondary text-secondary-foreground',
    ringColor: 'ring-border',
    description: 'Esta semana ainda não começou.',
  },
  skipped: {
    label: 'Não dada',
    icon: XCircle,
    dotColor: 'bg-red-400',
    badgeClass: 'bg-red-400/10 text-red-400',
    ringColor: 'ring-red-400/30',
    description: 'Os conteúdos desta semana não foram leccionados. Serão redistribuídos.',
  },
}

function TimelineSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-18" />
        </div>
      </div>
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3 pl-2">
            <Skeleton className="h-3 w-3 rounded-full mt-2.5 shrink-0" />
            <Skeleton className="h-16 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PedagogicalTimeline({ planId }: Props) {
  const [data, setData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function fetchTimeline() {
      try {
        const res = await fetchWithAuth(`/api/plans/timeline?planId=${planId}`)
        const json = await res.json()
        if (json.success && json.data) {
          setData(json.data)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchTimeline()
  }, [planId])

  if (loading) return <TimelineSkeleton />
  if (!data || data.weeks.length === 0) return null

  const completed = data.weeks.filter(w => w.status === 'completed').length
  const partial = data.weeks.filter(w => w.status === 'partial').length
  const skipped = data.weeks.filter(w => w.status === 'skipped').length
  const pending = data.weeks.filter(w => w.status === 'pending').length

  const INITIAL_SHOW = 5
  const visibleWeeks = showAll ? data.weeks : data.weeks.slice(0, INITIAL_SHOW)
  const hasMore = data.weeks.length > INITIAL_SHOW

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold">Cronograma Pedagógico</h2>
        </div>
        {data.trimester && (
          <Badge variant="accent">{data.trimester}º Trimestre</Badge>
        )}
      </div>

      {/* Animated progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Progresso do trimestre</span>
          <span className="text-xs font-medium">{data.progressPercent}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent/80"
            initial={{ width: 0 }}
            animate={{ width: `${data.progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {completed > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              {completed} concluída{completed !== 1 ? 's' : ''}
            </span>
          )}
          {partial > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {partial} parcial{partial !== 1 ? 'is' : ''}
            </span>
          )}
          {skipped > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              {skipped} não dada{skipped !== 1 ? 's' : ''}
            </span>
          )}
          {pending > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              {pending} pendente{pending !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Week-by-week timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border/60" />

        <div className="space-y-1">
          {visibleWeeks.map((week, i) => {
            const cfg = STATUS_CONFIG[week.status]
            const StatusIcon = cfg.icon
            const isExpanded = expandedWeek === i
            const isHighlighted = week.status === 'skipped' || week.status === 'partial'

            return (
              <div key={i} className="relative flex items-start gap-3 pl-0">
                {/* Timeline dot */}
                <motion.div
                  className={`relative z-10 mt-2.5 h-[12px] w-[12px] shrink-0 rounded-full border-2 border-background ${cfg.dotColor}`}
                  style={{ marginLeft: '10px' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                />

                {/* Content card */}
                <div
                  className={`flex-1 rounded-lg border bg-background/50 p-3 mb-1 transition-all cursor-pointer ${
                    isHighlighted
                      ? `border-${week.status === 'skipped' ? 'red-400/40' : 'amber-500/40'} ${
                          week.status === 'skipped' ? 'bg-red-400/5' : 'bg-amber-500/5'
                        }`
                      : isExpanded
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-border/30 hover:border-border/60'
                  }`}
                  onClick={() => setExpandedWeek(isExpanded ? null : i)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Semana {week.week}</span>
                      {week.period && (
                        <span className="text-xs text-muted-foreground">{week.period}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={cfg.badgeClass}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {cfg.label}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Unidade {week.unit}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {week.numLessons} aula{week.numLessons !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                    {week.contents}
                  </p>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-2.5">
                          {/* Status explanation */}
                          <p className="text-xs text-muted-foreground italic">
                            {cfg.description}
                          </p>

                          {/* Objectives */}
                          {week.objectives && (
                            <div>
                              <span className="text-xs font-medium">Objectivos:</span>
                              <p className="text-xs text-muted-foreground mt-0.5">{week.objectives}</p>
                            </div>
                          )}

                          {/* Lesson breakdown */}
                          {week.lessonCount.total > 0 && (
                            <div>
                              <span className="text-xs font-medium">Aulas desta semana:</span>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {week.lessonCount.delivered > 0 && (
                                  <span className="text-xs text-green-500">
                                    {week.lessonCount.delivered} dada{week.lessonCount.delivered !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {week.lessonCount.partial > 0 && (
                                  <span className="text-xs text-amber-500">
                                    {week.lessonCount.partial} parcial{week.lessonCount.partial !== 1 ? 'is' : ''}
                                  </span>
                                )}
                                {week.lessonCount.skipped > 0 && (
                                  <span className="text-xs text-red-400">
                                    {week.lessonCount.skipped} não dada{week.lessonCount.skipped !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>

        {/* Show more / less */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/40 py-2 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ver todas as {data.weeks.length} semanas
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
