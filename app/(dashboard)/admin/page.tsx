'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  Loader2,
  ArrowRight,
  GraduationCap,
  Calendar,
  CalendarDays,
  CalendarRange,
  Shield,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { useAuth } from '@/src/ui/providers/auth-provider'

interface AdminStats {
  totalUsers: number
  roleCounts: Record<string, number>
  totalPlans: number
  plansByStatus: Record<string, number>
  plansByType: Record<string, number>
  recentPlans: {
    id: string
    title: string
    type: string
    subject: string
    grade: string
    status: string
    createdAt: string
  }[]
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-secondary text-secondary-foreground' },
  GENERATING: { label: 'A gerar', className: 'bg-yellow-500/10 text-yellow-500' },
  GENERATED: { label: 'Gerado', className: 'bg-accent/10 text-accent' },
  REVIEWED: { label: 'Revisto', className: 'bg-blue-500/10 text-blue-500' },
  APPROVED: { label: 'Aprovado', className: 'bg-green-500/10 text-green-500' },
}

const TYPE_ICONS: Record<string, typeof Calendar> = {
  ANNUAL: Calendar,
  TRIMESTER: CalendarDays,
  BIWEEKLY: CalendarRange,
  LESSON: GraduationCap,
}

export default function AdminPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(API_ROUTES.ADMIN_STATS)
        const data = await res.json()
        if (res.ok && data.data) setStats(data.data)
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-destructive/50" />
        <h2 className="mt-4 text-lg font-semibold">Acesso Negado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Apenas administradores e coordenadores podem aceder a esta área.
        </p>
      </div>
    )
  }

  const pendingReview = (stats.plansByStatus['GENERATED'] || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Painel {user?.role === 'ADMIN' ? 'Administrativo' : 'do Coordenador'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral de professores, planos e actividade da {user?.school || 'plataforma'}.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs">Utilizadores</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{stats.totalUsers}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(stats.roleCounts).map(([role, count]) => (
              <span key={role} className="text-[10px] text-muted-foreground">
                {count} {role === 'TEACHER' ? 'prof.' : role === 'COORDINATOR' ? 'coord.' : 'admin'}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-xs">Total Planos</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{stats.totalPlans}</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs">Aprovados</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-green-600">{stats.plansByStatus['APPROVED'] || 0}</div>
        </div>
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-center gap-2 text-accent">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Para Revisão</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-accent">{pendingReview}</div>
          {pendingReview > 0 && (
            <Link href={ROUTES.ADMIN_PLANS + '?status=GENERATED'} className="mt-1 text-[10px] text-accent hover:underline">
              Ver planos →
            </Link>
          )}
        </div>
      </div>

      {/* Plans by Type */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-5">
        <h2 className="text-sm font-semibold mb-4">Planos por Tipo</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {['ANNUAL', 'TRIMESTER', 'BIWEEKLY', 'LESSON'].map(type => {
            const Icon = TYPE_ICONS[type] || FileText
            const labels: Record<string, string> = { ANNUAL: 'Anuais', TRIMESTER: 'Trimestrais', BIWEEKLY: 'Quinzenais', LESSON: 'Aulas' }
            return (
              <div key={type} className="flex items-center gap-3 rounded-lg border border-border/30 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.plansByType[type] || 0}</div>
                  <div className="text-xs text-muted-foreground">{labels[type]}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={ROUTES.ADMIN_TEACHERS}
          className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card/50 p-5 hover:border-accent/20 transition-colors"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Gestão de Professores</h3>
            <p className="text-xs text-muted-foreground">Ver todos os professores e suas estatísticas</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
        </Link>

        <Link
          href={ROUTES.ADMIN_PLANS}
          className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card/50 p-5 hover:border-accent/20 transition-colors"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <BarChart3 className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Todos os Planos</h3>
            <p className="text-xs text-muted-foreground">Ver, filtrar e aprovar planos de todos os professores</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
        </Link>
      </div>

      {/* Recent Plans */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Planos Recentes
          </h2>
          <Link href={ROUTES.ADMIN_PLANS} className="text-xs text-accent hover:underline">Ver todos</Link>
        </div>
        {stats.recentPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plano gerado ainda.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentPlans.map(plan => {
              const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT
              return (
                <Link
                  key={plan.id}
                  href={`/plans/${plan.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border/30 p-3 hover:bg-card transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{plan.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">{plan.subject}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{plan.grade}</Badge>
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${statusCfg.className}`}>{statusCfg.label}</Badge>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {new Date(plan.createdAt).toLocaleDateString('pt-AO')}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
