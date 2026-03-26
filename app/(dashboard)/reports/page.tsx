'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Search,
  MoreVertical,
  GraduationCap,
  Trash2,
  Eye,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  Users,
  CalendarDays,
  AlertTriangle,
  Lightbulb,
  Loader2,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Select } from '@/src/ui/components/ui/select'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

type ReportStatus = 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEWED' | 'FINALIZED'

interface ReportObjective {
  description: string
  status: 'achieved' | 'partial' | 'not_achieved'
  evidence?: string
}

interface ReportData {
  id: string
  title: string
  type: string
  subject: string
  grade: string
  academicYear: string
  period: { trimester?: number; year: number }
  content: {
    summary?: string
    objectivesAchieved?: ReportObjective[]
    topicsCovered?: { title: string; hoursSpent: number; completionPercentage: number }[]
    challenges?: string[]
    recommendations?: string[]
    statistics?: {
      totalLessonsDelivered: number
      totalHoursWorked: number
      totalTopicsCovered: number
      plannedVsDelivered: number
      averageStudentCount?: number
    }
  }
  status: ReportStatus
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
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
  FINALIZED: {
    label: 'Finalizado',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-500',
  },
}

const TRIMESTER_LABELS: Record<number, string> = {
  1: '1º Trimestre',
  2: '2º Trimestre',
  3: '3º Trimestre',
}

const TRIMESTER_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/10 text-emerald-500',
  2: 'bg-blue-500/10 text-blue-500',
  3: 'bg-purple-500/10 text-purple-500',
}

export default function ReportsPage() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')

  const [reports, setReports] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trimesterFilter, setTrimesterFilter] = useState('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [expandedReport, setExpandedReport] = useState<string | null>(null)

  const isTrimester = !typeParam || typeParam === 'TRIMESTER'

  useEffect(() => {
    async function fetchReports() {
      try {
        const type = isTrimester ? 'TRIMESTER' : 'ANNUAL'
        const res = await fetchWithAuth(`${API_ROUTES.REPORTS}?type=${type}`)
        const data = await res.json()
        if (res.ok && data.data) {
          setReports(data.data)
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }
    setIsLoading(true)
    fetchReports()
  }, [isTrimester])

  async function handleUpdateStatus(reportId: string, status: ReportStatus) {
    try {
      const res = await fetchWithAuth(`${API_ROUTES.REPORTS}/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
      }
    } catch {
      // silently fail
    }
    setOpenMenu(null)
  }

  async function handleDelete(reportId: string) {
    try {
      const res = await fetchWithAuth(`${API_ROUTES.REPORTS}/${reportId}`, { method: 'DELETE' })
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId))
      }
    } catch {
      // silently fail
    }
    setOpenMenu(null)
  }

  const isEmpty = reports.length === 0 && !isLoading

  const filtered = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.grade.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const trimester = r.period?.trimester || 0
    const matchesTrimester =
      trimesterFilter === 'all' || trimester === Number(trimesterFilter)
    return matchesSearch && matchesStatus && matchesTrimester
  })

  // Agrupar por trimestre
  const groupedByTrimester = filtered.reduce<Record<number, ReportData[]>>((acc, report) => {
    const t = report.period?.trimester || 0
    if (!acc[t]) acc[t] = []
    acc[t].push(report)
    return acc
  }, {})

  // Helper para extrair stats do relatório
  function getReportStats(report: ReportData) {
    const stats = report.content?.statistics
    const objectives = report.content?.objectivesAchieved || []
    return {
      lessonsDelivered: stats?.totalLessonsDelivered || 0,
      hoursWorked: stats?.totalHoursWorked || 0,
      topicsCovered: stats?.totalTopicsCovered || 0,
      plannedVsDelivered: stats?.plannedVsDelivered || 0,
      averageStudentCount: stats?.averageStudentCount || 0,
      objectivesAchieved: objectives.filter(o => o.status === 'achieved').length,
      objectivesPartial: objectives.filter(o => o.status === 'partial').length,
      objectivesNotAchieved: objectives.filter(o => o.status === 'not_achieved').length,
      challengesCount: report.content?.challenges?.length || 0,
      recommendationsCount: report.content?.recommendations?.length || 0,
      hasStats: (stats?.totalLessonsDelivered || 0) > 0,
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isTrimester ? 'Relatórios Trimestrais' : 'Relatórios Anuais'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isTrimester
              ? 'Relatórios detalhados de cada trimestre com análise de desempenho e recomendações.'
              : 'Relatórios anuais consolidados com visão geral do ano lectivo.'}
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={ROUTES.REPORTS_NEW}>
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Relatório
          </Link>
        </Button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 rounded-lg border border-border/40 bg-card/30 p-1">
        <Link
          href={ROUTES.REPORTS_TRIMESTER}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            isTrimester
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="mr-1.5 inline h-3.5 w-3.5" />
          Trimestral
        </Link>
        <Link
          href={ROUTES.REPORTS_ANNUAL}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            !isTrimester
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="mr-1.5 inline h-3.5 w-3.5" />
          Anual
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar relatórios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground sm:hidden" />
          {isTrimester && (
            <Select
              value={trimesterFilter}
              onChange={(e) => setTrimesterFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="all">Todos trimestres</option>
              <option value="1">1º Trimestre</option>
              <option value="2">2º Trimestre</option>
              <option value="3">3º Trimestre</option>
            </Select>
          )}
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
            <option value="FINALIZED">Finalizado</option>
          </Select>
        </div>
      </div>

      {/* Trimester Overview Cards */}
      {!isEmpty && isTrimester && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((t) => {
            const count = reports.filter((r) => (r.period?.trimester || 0) === t).length
            const finalized = reports.filter(
              (r) => (r.period?.trimester || 0) === t && r.status === 'FINALIZED',
            ).length
            return (
              <button
                key={t}
                onClick={() =>
                  setTrimesterFilter(trimesterFilter === String(t) ? 'all' : String(t))
                }
                className={`rounded-xl border p-4 text-left transition-all ${
                  trimesterFilter === String(t)
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-border/40 bg-card/50 hover:border-accent/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge className={TRIMESTER_COLORS[t]}>{TRIMESTER_LABELS[t]}</Badge>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    relatório{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {finalized} finalizado{finalized !== 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <BarChart3 className="h-8 w-8 text-accent" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhum relatório encontrado</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Gere relatórios {isTrimester ? 'trimestrais' : 'anuais'} automaticamente com base nas suas aulas leccionadas, planos
            e actividades registadas.
          </p>
          <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href={ROUTES.REPORTS_NEW}>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Primeiro Relatório
            </Link>
          </Button>
        </div>
      )}

      {/* Reports grouped by trimester */}
      {!isEmpty && Object.keys(groupedByTrimester).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedByTrimester)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([trimester, trimesterReports]) => (
              <div key={trimester}>
                {/* Group Header */}
                {isTrimester && trimesterFilter === 'all' && (
                  <div className="mb-3 flex items-center gap-2">
                    <Badge className={TRIMESTER_COLORS[Number(trimester)] || 'bg-secondary text-secondary-foreground'}>
                      {TRIMESTER_LABELS[Number(trimester)] || `Trimestre ${trimester}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {trimesterReports.length} relatório
                      {trimesterReports.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 border-t border-border/30" />
                  </div>
                )}

                {/* Reports */}
                <div className="space-y-3">
                  {trimesterReports.map((report) => {
                    const statusCfg = STATUS_CONFIG[report.status]
                    const StatusIcon = statusCfg.icon
                    const isExpanded = expandedReport === report.id
                    const s = getReportStats(report)
                    const totalObjectives = s.objectivesAchieved + s.objectivesPartial + s.objectivesNotAchieved

                    return (
                      <div
                        key={report.id}
                        className="group rounded-xl border border-border/40 bg-card/50 transition-all hover:border-accent/20 hover:bg-card/80"
                      >
                        {/* Main Row */}
                        <div className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                          {/* Icon */}
                          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            <BarChart3 className="h-6 w-6 text-accent" />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold sm:text-base">
                              {report.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="accent">
                                <GraduationCap className="mr-1 h-3 w-3" />
                                {report.grade}
                              </Badge>
                              <Badge variant="secondary">{report.subject}</Badge>
                              <Badge className={statusCfg.className}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusCfg.label}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              Ano Lectivo: {report.academicYear}
                              {report.period?.trimester ? ` · ${TRIMESTER_LABELS[report.period.trimester]}` : ''}
                            </p>
                          </div>

                          {/* Quick stat */}
                          {s.hasStats && (
                            <div className="hidden sm:flex flex-col items-center rounded-lg border border-border/30 bg-background/50 px-3 py-2">
                              <span className="text-lg font-bold text-accent">
                                {s.plannedVsDelivered}%
                              </span>
                              <span className="text-[10px] text-muted-foreground">Cumprido</span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setExpandedReport(isExpanded ? null : report.id)
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
                                  setOpenMenu(openMenu === report.id ? null : report.id)
                                }
                                className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openMenu === report.id && (
                                <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-border/40 bg-card p-1 shadow-lg">
                                  <button
                                    onClick={() => { setOpenMenu(null) }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver Relatório
                                  </button>
                                  <div className="my-1 h-px bg-border/40" />
                                  <button
                                    onClick={() => handleDelete(report.id)}
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
                            {/* Summary */}
                            {report.content?.summary && (
                              <div className="mb-4 rounded-lg border border-border/30 bg-background/50 p-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sumário</h4>
                                <p className="text-sm leading-relaxed whitespace-pre-line">{report.content.summary}</p>
                              </div>
                            )}

                            {/* Statistics Grid */}
                            {s.hasStats ? (
                              <>
                                <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                                    <CalendarDays className="mx-auto h-4 w-4 text-accent mb-1" />
                                    <div className="text-xl font-bold">{s.lessonsDelivered}</div>
                                    <div className="text-[10px] text-muted-foreground">Aulas Dadas</div>
                                  </div>
                                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                                    <Clock className="mx-auto h-4 w-4 text-accent mb-1" />
                                    <div className="text-xl font-bold">{s.hoursWorked}h</div>
                                    <div className="text-[10px] text-muted-foreground">Horas</div>
                                  </div>
                                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                                    <BookOpen className="mx-auto h-4 w-4 text-accent mb-1" />
                                    <div className="text-xl font-bold">{s.topicsCovered}</div>
                                    <div className="text-[10px] text-muted-foreground">Temas</div>
                                  </div>
                                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                                    <TrendingUp className="mx-auto h-4 w-4 text-accent mb-1" />
                                    <div className="text-xl font-bold">{s.plannedVsDelivered}%</div>
                                    <div className="text-[10px] text-muted-foreground">Cumprimento</div>
                                  </div>
                                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                                    <Users className="mx-auto h-4 w-4 text-accent mb-1" />
                                    <div className="text-xl font-bold">{s.averageStudentCount}</div>
                                    <div className="text-[10px] text-muted-foreground">Média Alunos</div>
                                  </div>
                                </div>

                                {/* Objectives Progress */}
                                {totalObjectives > 0 && (
                                  <div className="mt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Target className="h-4 w-4 text-accent" />
                                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Objectivos ({totalObjectives})
                                      </span>
                                    </div>
                                    <div className="flex h-3 overflow-hidden rounded-full">
                                      {s.objectivesAchieved > 0 && (
                                        <div
                                          className="bg-green-500 transition-all"
                                          style={{ width: `${(s.objectivesAchieved / totalObjectives) * 100}%` }}
                                        />
                                      )}
                                      {s.objectivesPartial > 0 && (
                                        <div
                                          className="bg-yellow-500 transition-all"
                                          style={{ width: `${(s.objectivesPartial / totalObjectives) * 100}%` }}
                                        />
                                      )}
                                      {s.objectivesNotAchieved > 0 && (
                                        <div
                                          className="bg-red-500 transition-all"
                                          style={{ width: `${(s.objectivesNotAchieved / totalObjectives) * 100}%` }}
                                        />
                                      )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4 text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                        <span className="text-muted-foreground">Alcançados: {s.objectivesAchieved}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                                        <span className="text-muted-foreground">Parciais: {s.objectivesPartial}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                                        <span className="text-muted-foreground">Não alcançados: {s.objectivesNotAchieved}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Challenges & Recommendations summary */}
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Desafios
                                      </span>
                                    </div>
                                    <div className="text-lg font-bold">{s.challengesCount}</div>
                                    <p className="text-xs text-muted-foreground">
                                      desafios identificados
                                    </p>
                                  </div>
                                  <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Lightbulb className="h-3.5 w-3.5 text-accent" />
                                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Recomendações
                                      </span>
                                    </div>
                                    <div className="text-lg font-bold">{s.recommendationsCount}</div>
                                    <p className="text-xs text-muted-foreground">
                                      recomendações para melhoria
                                    </p>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/50 px-4 py-6">
                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    Relatório ainda não foi gerado
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Gere o relatório com IA para visualizar as estatísticas e
                                    análises.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Dates */}
                            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Criado: {new Date(report.createdAt).toLocaleDateString('pt-AO')}</span>
                              <span>Actualizado: {new Date(report.updatedAt).toLocaleDateString('pt-AO')}</span>
                            </div>

                            {/* Actions Row */}
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              {(report.status === 'GENERATED' || report.status === 'REVIEWED') && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                                    onClick={() => handleUpdateStatus(report.id, 'FINALIZED')}
                                  >
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    Finalizar Relatório
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(report.id)}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Eliminar
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

      {/* AI Banner */}
      <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold sm:text-base">
                Relatórios gerados automaticamente
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                A IA analisa as suas aulas, planos e actividades para gerar relatórios completos
                com estatísticas, desafios e recomendações.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 sm:shrink-0"
            asChild
          >
            <Link href={ROUTES.REPORTS_NEW}>
              Gerar Relatório
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
