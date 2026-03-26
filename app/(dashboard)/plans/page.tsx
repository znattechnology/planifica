'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  FileText,
  Calendar,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  Sparkles,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Select } from '@/src/ui/components/ui/select'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

type PlanStatus = 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEWED' | 'APPROVED'
type PlanType = 'ANNUAL' | 'TRIMESTER' | 'BIWEEKLY' | 'LESSON'

interface PlanItem {
  id: string
  title: string
  subject: string
  grade: string
  academicYear: string
  type: PlanType
  trimester?: number
  status: PlanStatus
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  DRAFT: { label: 'Rascunho', icon: FileText, className: 'bg-secondary text-secondary-foreground' },
  GENERATING: { label: 'A gerar...', icon: Clock, className: 'bg-yellow-500/10 text-yellow-500' },
  GENERATED: { label: 'Gerado', icon: Sparkles, className: 'bg-accent/10 text-accent' },
  REVIEWED: { label: 'Revisto', icon: Eye, className: 'bg-blue-500/10 text-blue-500' },
  APPROVED: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500' },
}

const TYPE_CONFIG: Record<PlanType, { label: string; icon: typeof Calendar; href: string }> = {
  ANNUAL: { label: 'Anual', icon: Calendar, href: ROUTES.PLANS_ANNUAL },
  TRIMESTER: { label: 'Trimestral', icon: CalendarDays, href: ROUTES.PLANS_TRIMESTER },
  BIWEEKLY: { label: 'Quinzenal', icon: CalendarRange, href: ROUTES.PLANS_BIWEEKLY },
  LESSON: { label: 'Aula', icon: GraduationCap, href: ROUTES.PLANS_LESSON },
}

export default function PlansPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetchWithAuth(API_ROUTES.PLANS)
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
      const res = await fetch(`${API_ROUTES.PLANS}?id=${id}`, { method: 'DELETE' })
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
      const res = await fetch(API_ROUTES.PLANS, {
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

  const filtered = plans.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.subject.toLowerCase().includes(search.toLowerCase()) ||
      p.grade.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || p.type === typeFilter
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  // Group by type
  const groupedByType = filtered.reduce<Record<string, PlanItem[]>>((acc, plan) => {
    const key = plan.type
    if (!acc[key]) acc[key] = []
    acc[key].push(plan)
    return acc
  }, {})

  const typeOrder: PlanType[] = ['ANNUAL', 'TRIMESTER', 'BIWEEKLY', 'LESSON']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dosificações e Planos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize e gira todos os seus planos num só lugar.
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={ROUTES.PLANS_NEW}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar planos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">Todos os tipos</option>
            <option value="ANNUAL">Anuais</option>
            <option value="TRIMESTER">Trimestrais</option>
            <option value="BIWEEKLY">Quinzenais</option>
            <option value="LESSON">Aulas</option>
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

      {/* Type Overview Cards */}
      {!isEmpty && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {typeOrder.map((t) => {
            const cfg = TYPE_CONFIG[t]
            const TypeIcon = cfg.icon
            const count = plans.filter((p) => p.type === t).length
            const approved = plans.filter((p) => p.type === t && p.status === 'APPROVED').length
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  typeFilter === t
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-border/40 bg-card/50 hover:border-accent/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
                  <TypeIcon className="h-4 w-4 text-accent" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    plano{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {approved} aprovado{approved !== 1 ? 's' : ''}
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
            <FileText className="h-8 w-8 text-accent" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhum plano criado</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Comece por criar uma dosificação e depois gere planos automaticamente com a IA.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
              <Link href={ROUTES.PLANS_NEW}>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </Link>
            </Button>
            <Button variant="outline" className="border-border/60" asChild>
              <Link href={ROUTES.PLANO_ANUAL_NEW}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Dosificação
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Plans grouped by type */}
      {!isEmpty && Object.keys(groupedByType).length > 0 && (
        <div className="space-y-6">
          {typeOrder
            .filter((t) => groupedByType[t]?.length > 0)
            .map((type) => {
              const typeCfg = TYPE_CONFIG[type]
              const TypeIcon = typeCfg.icon
              const typePlans = groupedByType[type]

              return (
                <div key={type}>
                  {/* Group Header */}
                  {typeFilter === 'all' && (
                    <div className="mb-3 flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-accent" />
                      <span className="text-sm font-semibold">{typeCfg.label === 'Aula' ? 'Planos de Aula' : `Dosificação ${typeCfg.label}`}</span>
                      <span className="text-xs text-muted-foreground">
                        ({typePlans.length})
                      </span>
                      <div className="flex-1 border-t border-border/30" />
                      <Link href={typeCfg.href} className="text-xs text-accent hover:underline">
                        Ver todos
                        <ArrowRight className="ml-1 inline h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {/* Plans */}
                  <div className="space-y-2">
                    {typePlans
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((plan) => {
                        const statusCfg = STATUS_CONFIG[plan.status]
                        const StatusIcon = statusCfg.icon

                        return (
                          <div
                            key={plan.id}
                            className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-4 transition-all hover:border-accent/20 hover:bg-card/80"
                          >
                            {/* Icon */}
                            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                              <TypeIcon className="h-5 w-5 text-accent" />
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold">{plan.title}</h3>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <Badge variant="accent" className="text-xs">
                                  <GraduationCap className="mr-1 h-3 w-3" />
                                  {plan.grade}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">{plan.subject}</Badge>
                                <Badge className={`text-xs ${statusCfg.className}`}>
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {statusCfg.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Date */}
                            <div className="hidden sm:block text-xs text-muted-foreground">
                              {new Date(plan.createdAt).toLocaleDateString('pt-AO')}
                            </div>

                            {/* Actions */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenu(openMenu === plan.id ? null : plan.id)}
                                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openMenu === plan.id && (
                                <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-border/40 bg-card p-1 shadow-lg">
                                  <Link
                                    href={`/plans/${plan.id}`}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver detalhes
                                  </Link>
                                  {(plan.status === 'GENERATED' || plan.status === 'REVIEWED') && (
                                    <button
                                      onClick={() => handleUpdateStatus(plan.id, 'APPROVED')}
                                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Aprovar
                                    </button>
                                  )}
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
                        )
                      })}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* No results */}
      {!isEmpty && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card/30 px-4 py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Nenhum resultado para &ldquo;{search}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Tente pesquisar por outro termo ou altere os filtros
          </p>
        </div>
      )}
    </div>
  )
}
