'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  Eye,
  Search,
  GraduationCap,
  Calendar,
  CalendarDays,
  CalendarRange,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { Input } from '@/src/ui/components/ui/input'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'

interface PlanData {
  id: string
  title: string
  type: string
  subject: string
  grade: string
  status: string
  academicYear: string
  createdAt: string
  teacher: { name: string; email: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  DRAFT: { label: 'Rascunho', icon: FileText, className: 'bg-secondary text-secondary-foreground' },
  GENERATING: { label: 'A gerar', icon: Clock, className: 'bg-yellow-500/10 text-yellow-500' },
  GENERATED: { label: 'Gerado', icon: Sparkles, className: 'bg-accent/10 text-accent' },
  REVIEWED: { label: 'Revisto', icon: Eye, className: 'bg-blue-500/10 text-blue-500' },
  APPROVED: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Calendar }> = {
  ANNUAL: { label: 'Anual', icon: Calendar },
  TRIMESTER: { label: 'Trimestral', icon: CalendarDays },
  BIWEEKLY: { label: 'Quinzenal', icon: CalendarRange },
  LESSON: { label: 'Aula', icon: GraduationCap },
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')

  useEffect(() => {
    async function fetchPlans() {
      try {
        const params = new URLSearchParams()
        if (filterStatus !== 'ALL') params.set('status', filterStatus)
        if (filterType !== 'ALL') params.set('type', filterType)
        const url = `${API_ROUTES.ADMIN_ALL_PLANS}${params.toString() ? '?' + params.toString() : ''}`
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok && data.data) setPlans(data.data)
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlans()
  }, [filterStatus, filterType])

  async function handleApprove(planId: string) {
    try {
      const res = await fetch(API_ROUTES.PLANS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, status: 'APPROVED' }),
      })
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: 'APPROVED' } : p))
      }
    } catch {
      // ignore
    }
  }

  async function handleReview(planId: string) {
    try {
      const res = await fetch(API_ROUTES.PLANS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, status: 'REVIEWED' }),
      })
      if (res.ok) {
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, status: 'REVIEWED' } : p))
      }
    } catch {
      // ignore
    }
  }

  const filtered = plans.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.subject.toLowerCase().includes(search.toLowerCase()) ||
    (p.teacher?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.ADMIN}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Todos os Planos</h1>
        <p className="mt-1 text-sm text-muted-foreground">{plans.length} planos no total</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pesquisar por título, disciplina, professor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 self-center">Estado:</span>
          {['ALL', 'GENERATED', 'REVIEWED', 'APPROVED', 'DRAFT'].map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setIsLoading(true) }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 self-center">Tipo:</span>
          {['ALL', 'ANNUAL', 'TRIMESTER', 'BIWEEKLY', 'LESSON'].map(t => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setIsLoading(true) }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterType === t
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'ALL' ? 'Todos' : TYPE_CONFIG[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold">Nenhum plano encontrado</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(plan => {
            const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT
            const StatusIcon = statusCfg.icon
            const typeCfg = TYPE_CONFIG[plan.type] || TYPE_CONFIG.ANNUAL
            const canApprove = plan.status === 'GENERATED' || plan.status === 'REVIEWED'
            const canReview = plan.status === 'GENERATED'

            return (
              <div
                key={plan.id}
                className="rounded-xl border border-border/40 bg-card/50 p-4 hover:border-accent/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/plans/${plan.id}`} className="text-sm font-semibold hover:text-accent transition-colors">
                      {plan.title}
                    </Link>
                    {plan.teacher && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        por {plan.teacher.name}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{typeCfg.label}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{plan.subject}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{plan.grade}</Badge>
                      <Badge className={`text-[10px] ${statusCfg.className}`}>
                        <StatusIcon className="mr-1 h-2.5 w-2.5" />
                        {statusCfg.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(plan.createdAt).toLocaleDateString('pt-AO')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                      <Link href={`/plans/${plan.id}`}>
                        <Eye className="mr-1 h-3 w-3" />Ver
                      </Link>
                    </Button>
                    {canReview && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-blue-500/40 text-blue-500 hover:bg-blue-500/10"
                        onClick={() => handleReview(plan.id)}
                      >
                        Revisar
                      </Button>
                    )}
                    {canApprove && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 text-white hover:bg-green-700"
                        onClick={() => handleApprove(plan.id)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Aprovar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
