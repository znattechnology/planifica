'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  GraduationCap,
  Search,
  MoreVertical,
  FileText,
  Trash2,
  Pencil,
  Eye,
  Sparkles,
  ArrowRight,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
  CalendarRange,
  Layers,
  Timer,
  Users,
  Lightbulb,
  ClipboardList,
  Loader2,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Select } from '@/src/ui/components/ui/select'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { exportPlanToPDF } from '@/src/shared/utils/pdf-export'
import { exportPlanToWord } from '@/src/shared/utils/word-export'
import { exportPlanToExcel } from '@/src/shared/utils/excel-export'

type PlanStatus = 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEWED' | 'APPROVED'

interface PlanItem {
  id: string
  title: string
  subject: string
  grade: string
  academicYear: string
  trimester: number
  status: PlanStatus
  parentPlanTitle?: string
  content?: {
    topic?: string
    duration?: number
    objectives?: string[]
    methodology?: string
    resources?: string[]
    week?: number
    lessonNumber?: number
    phases?: {
      introduction: number
      development: number
      conclusion: number
    }
  }
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  DRAFT: {
    label: 'Rascunho',
    icon: FileText,
    className: 'bg-secondary text-secondary-foreground',
  },
  GENERATING: {
    label: 'A gerar...',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-500',
  },
  GENERATED: {
    label: 'Gerado',
    icon: Sparkles,
    className: 'bg-accent/10 text-accent',
  },
  REVIEWED: {
    label: 'Revisto',
    icon: Eye,
    className: 'bg-blue-500/10 text-blue-500',
  },
  APPROVED: {
    label: 'Aprovado',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-500',
  },
}

export default function LessonPlansPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetchWithAuth(`${API_ROUTES.PLANS}?type=LESSON`)
        const data = await res.json()
        if (res.ok && data.data) {
          const items = Array.isArray(data.data) ? data.data : data.data.data || []
          setPlans(items)
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlans()
  }, [])

  async function handleDelete(id: string) {
    try {
      const res = await fetchWithAuth(`${API_ROUTES.PLANS}?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.id !== id))
      }
    } catch {
      // ignore
    }
    setOpenMenu(null)
  }

  async function handleUpdateStatus(id: string, status: PlanStatus) {
    try {
      const res = await fetchWithAuth(API_ROUTES.PLANS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === id ? { ...p, status } : p))
      }
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const isEmpty = plans.length === 0

  const subjects = [...new Set(plans.map((p) => p.subject))]

  const filtered = plans.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.content?.topic ?? '').toLowerCase().includes(search.toLowerCase()) ||
      p.subject.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesSubject = subjectFilter === 'all' || p.subject === subjectFilter
    return matchesSearch && matchesStatus && matchesSubject
  })

  // Agrupar por disciplina+classe
  const groupedBySubject = filtered.reduce<Record<string, PlanItem[]>>((acc, plan) => {
    const key = `${plan.subject} - ${plan.grade}`
    if (!acc[key]) acc[key] = []
    acc[key].push(plan)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Planos de Aula</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planos detalhados para cada sessão, com fases, recursos e metodologia.
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={ROUTES.PLANS_NEW}>
            <Plus className="mr-2 h-4 w-4" />
            Gerar Plano de Aula
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por tema, título ou disciplina..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground sm:hidden" />
          <Select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">Todas disciplinas</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">Todos os estados</option>
            <option value="DRAFT">Rascunho</option>
            <option value="GENERATING">A gerar</option>
            <option value="GENERATED">Gerado</option>
            <option value="REVIEWED">Revisto</option>
            <option value="APPROVED">Aprovado</option>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      {!isEmpty && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
            <div className="text-2xl font-bold">{plans.length}</div>
            <div className="text-xs text-muted-foreground">Total de Aulas</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {plans.filter((p) => p.status === 'APPROVED').length}
            </div>
            <div className="text-xs text-muted-foreground">Aprovadas</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {plans.filter((p) => p.status === 'GENERATED' || p.status === 'REVIEWED').length}
            </div>
            <div className="text-xs text-muted-foreground">Em Revisão</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {plans.reduce((sum, p) => sum + (p.content?.duration ?? 0), 0)} min
            </div>
            <div className="text-xs text-muted-foreground">Tempo Total</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <GraduationCap className="h-8 w-8 text-accent" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhum plano de aula</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Gere planos de aula detalhados a partir de um plano quinzenal aprovado. Cada aula terá
            introdução, desenvolvimento e conclusão com tempos definidos.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
              <Link href={ROUTES.PLANS_NEW}>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </Link>
            </Button>
            <Button variant="outline" className="border-border/60" asChild>
              <Link href={ROUTES.PLANS_BIWEEKLY}>
                <CalendarRange className="mr-2 h-4 w-4" />
                Ver Dosificações Quinzenais
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Plans grouped by subject */}
      {!isEmpty && Object.keys(groupedBySubject).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedBySubject).map(([subjectKey, subjectPlans]) => (
            <div key={subjectKey}>
              {/* Group Header */}
              <div className="mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">{subjectKey}</span>
                <span className="text-xs text-muted-foreground">
                  ({subjectPlans.length} aula{subjectPlans.length !== 1 ? 's' : ''})
                </span>
                <div className="flex-1 border-t border-border/30" />
              </div>

              {/* Lessons */}
              <div className="space-y-3">
                {subjectPlans
                  .sort((a, b) => (a.content?.week ?? 0) - (b.content?.week ?? 0) || (a.content?.lessonNumber ?? 0) - (b.content?.lessonNumber ?? 0))
                  .map((plan) => {
                    const statusCfg = STATUS_CONFIG[plan.status]
                    const StatusIcon = statusCfg.icon
                    const isExpanded = expandedPlan === plan.id
                    const phases = plan.content?.phases
                    const totalPhases =
                      (phases?.introduction ?? 0) + (phases?.development ?? 0) + (phases?.conclusion ?? 0)

                    return (
                      <div
                        key={plan.id}
                        className="group rounded-xl border border-border/40 bg-card/50 transition-all hover:border-accent/20 hover:bg-card/80"
                      >
                        {/* Main Row */}
                        <div className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                          {/* Lesson number indicator */}
                          <div className="hidden sm:flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-accent/10">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground">
                              Aula
                            </span>
                            <span className="text-lg font-bold leading-none text-accent">
                              {plan.content?.lessonNumber ?? 0}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold sm:text-base">
                              {plan.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="accent">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {plan.content?.topic ?? ''}
                              </Badge>
                              <Badge variant="secondary">
                                <Timer className="mr-1 h-3 w-3" />
                                {plan.content?.duration ?? 0} min
                              </Badge>
                              <Badge variant="secondary">Sem. {plan.content?.week ?? 0}</Badge>
                              <Badge className={statusCfg.className}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusCfg.label}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              <Layers className="mr-1 inline h-3 w-3" />
                              {plan.parentPlanTitle}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setExpandedPlan(isExpanded ? null : plan.id)
                              }
                              className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenMenu(openMenu === plan.id ? null : plan.id)
                                }
                                className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openMenu === plan.id && (
                                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-border/40 bg-card p-1 shadow-lg">
                                  <Link
                                    href={`/plans/${plan.id}`}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver Plano Completo
                                  </Link>
                                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => exportPlanToPDF(plan)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Exportar PDF
                                  </button>
                                  <button
                                    onClick={() => exportPlanToWord(plan)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Exportar Word
                                  </button>
                                  <button
                                    onClick={() => exportPlanToExcel(plan)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Exportar Excel
                                  </button>
                                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    Duplicar Aula
                                  </button>
                                  <div className="my-1 h-px bg-border/40" />
                                  <button
                                    onClick={() => handleDelete(plan.id)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-border/30 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                            {/* Lesson Phases Timeline */}
                            {totalPhases > 0 && (
                              <div className="mb-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Fases da Aula
                                </span>
                                <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                                  <div
                                    className="bg-blue-500 transition-all"
                                    style={{
                                      width: `${((phases?.introduction ?? 0) / totalPhases) * 100}%`,
                                    }}
                                  />
                                  <div
                                    className="bg-accent transition-all"
                                    style={{
                                      width: `${((phases?.development ?? 0) / totalPhases) * 100}%`,
                                    }}
                                  />
                                  <div
                                    className="bg-purple-500 transition-all"
                                    style={{
                                      width: `${((phases?.conclusion ?? 0) / totalPhases) * 100}%`,
                                    }}
                                  />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-4 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                    <span className="text-muted-foreground">
                                      Introdução: {phases?.introduction ?? 0} min
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                                    <span className="text-muted-foreground">
                                      Desenvolvimento: {phases?.development ?? 0} min
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                                    <span className="text-muted-foreground">
                                      Conclusão: {phases?.conclusion ?? 0} min
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-3">
                              {/* Objectivos */}
                              <div className="rounded-lg border border-border/30 bg-background/50 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Target className="h-4 w-4 text-accent" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Objectivos
                                  </span>
                                </div>
                                {(plan.content?.objectives?.length ?? 0) > 0 ? (
                                  <div className="text-2xl font-bold">{plan.content?.objectives?.length}</div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Pendente
                                  </div>
                                )}
                              </div>

                              {/* Duração */}
                              <div className="rounded-lg border border-border/30 bg-background/50 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Timer className="h-4 w-4 text-accent" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Duração
                                  </span>
                                </div>
                                <div className="text-2xl font-bold">{plan.content?.duration ?? 0} min</div>
                              </div>

                              {/* Datas */}
                              <div className="rounded-lg border border-border/30 bg-background/50 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Clock className="h-4 w-4 text-accent" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Datas
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <div>Criado: {new Date(plan.createdAt).toLocaleDateString('pt-AO')}</div>
                                  <div>Actualizado: {new Date(plan.updatedAt).toLocaleDateString('pt-AO')}</div>
                                </div>
                              </div>
                            </div>

                            {/* Methodology */}
                            {plan.content?.methodology && (
                              <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Lightbulb className="h-3.5 w-3.5 text-accent" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Metodologia
                                  </span>
                                </div>
                                <p className="text-sm">{plan.content.methodology}</p>
                              </div>
                            )}

                            {/* Resources */}
                            {(plan.content?.resources?.length ?? 0) > 0 && (
                              <div className="mt-3 rounded-lg border border-border/30 bg-background/50 px-4 py-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <ClipboardList className="h-3.5 w-3.5 text-accent" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Recursos
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {plan.content!.resources!.map((resource, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {resource}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions Row */}
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              {plan.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                  Gerar com IA
                                </Button>
                              )}
                              {(plan.status === 'GENERATED' || plan.status === 'REVIEWED') && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                                    onClick={() => handleUpdateStatus(plan.id, 'APPROVED')}
                                  >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    Aprovar Aula
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-border/60"
                                  >
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                    Editar Conteúdo
                                  </Button>
                                </>
                              )}
                              {plan.status === 'APPROVED' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-border/60"
                                    onClick={() => exportPlanToPDF(plan)}
                                  >
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Exportar PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-border/60"
                                    onClick={() => exportPlanToWord(plan)}
                                  >
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Word
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-border/60"
                                    onClick={() => exportPlanToExcel(plan)}
                                  >
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Excel
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-border/60"
                                asChild
                              >
                                <Link href={`/plans/${plan.id}`}>
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  Ver Completo
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!isEmpty && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card/30 px-4 py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Nenhum resultado encontrado
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Tente pesquisar por outro termo ou altere os filtros
          </p>
        </div>
      )}

      {/* Info Banner */}
      <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold sm:text-base">
                Planos de aula completos com IA
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Cada plano inclui introdução, desenvolvimento e conclusão com tempos, objectivos
                específicos, metodologia, recursos e avaliação.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 sm:shrink-0"
            asChild
          >
            <Link href={ROUTES.PLANS_NEW}>
              Gerar Aulas
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
