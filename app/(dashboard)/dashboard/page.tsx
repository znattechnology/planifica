'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Calendar,
  CalendarDays,
  GraduationCap,
  BarChart3,
  ArrowRight,
  Sparkles,
  TrendingUp,
  BookOpen,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { SubscriptionCard } from '@/src/ui/components/subscription/subscription-card'

interface PlanSummary {
  id: string
  title: string
  type: string
  status: string
  subject: string
  grade: string
  createdAt: string
}

const QUICK_ACTIONS = [
  {
    label: 'Nova Dosificação Anual',
    description: 'Crie a dosificação completa do ano lectivo',
    href: ROUTES.PLANS_NEW,
    icon: Calendar,
  },
  {
    label: 'Dosificação Trimestral',
    description: 'Gere a dosificação do trimestre actual',
    href: ROUTES.PLANS_NEW,
    icon: CalendarDays,
  },
  {
    label: 'Plano de Aula',
    description: 'Crie um plano de aula com IA',
    href: ROUTES.PLANS_NEW,
    icon: GraduationCap,
  },
  {
    label: 'Nova Dosificação',
    description: 'Insira uma dosificação anual',
    href: ROUTES.PLANO_ANUAL_NEW,
    icon: BookOpen,
  },
]

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  GENERATING: 'A gerar...',
  GENERATED: 'Gerado',
  REVIEWED: 'Revisto',
  APPROVED: 'Aprovado',
}

const TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Anual',
  TRIMESTER: 'Trimestral',
  BIWEEKLY: 'Quinzenal',
  LESSON: 'Aula',
}

export default function DashboardPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [dosificacaoCount, setDosificacaoCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansRes, dosRes] = await Promise.all([
          fetchWithAuth(API_ROUTES.PLANS),
          fetchWithAuth(API_ROUTES.PLANO_ANUAL),
        ])
        const plansData = await plansRes.json()
        const dosData = await dosRes.json()
        if (plansRes.ok && plansData.data) {
          const items = Array.isArray(plansData.data) ? plansData.data : plansData.data.data || []
          setPlans(items)
        }
        if (dosRes.ok && dosData.data) setDosificacaoCount(dosData.data.length)
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalPlans = plans.length
  const lessonPlans = plans.filter(p => p.type === 'LESSON').length
  const approvedPlans = plans.filter(p => p.status === 'APPROVED').length
  const recentPlans = plans
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const stats = [
    {
      label: 'Planos Criados',
      value: String(totalPlans),
      change: `${dosificacaoCount} dosificaç${dosificacaoCount !== 1 ? 'ões' : 'ão'}`,
      icon: FileText,
    },
    {
      label: 'Aulas Geradas',
      value: String(lessonPlans),
      change: `de ${totalPlans} planos`,
      icon: GraduationCap,
    },
    {
      label: 'Aprovados',
      value: String(approvedPlans),
      change: totalPlans > 0 ? `${Math.round((approvedPlans / totalPlans) * 100)}% do total` : '0%',
      icon: BarChart3,
    },
    {
      label: 'Dosificações',
      value: String(dosificacaoCount),
      change: 'base dos planos',
      icon: BookOpen,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Bem-vindo ao Planifica
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            O seu assistente inteligente de planeamento educativo.
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={ROUTES.PLANS_NEW}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-card/50 p-5 transition-colors hover:bg-card/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <stat.icon className="h-4 w-4 text-accent" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold">{stat.value}</span>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-accent" />
                <span>{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent + Subscription */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ações Rápidas</h2>
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_ACTIONS.map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className="group flex items-center gap-4 rounded-xl border border-border/40 bg-card/30 p-4 transition-all hover:border-accent/40 hover:bg-card/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <action.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity + Subscription */}
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Subscrição
            </h2>
            <SubscriptionCard />
          </div>

          <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Actividade Recente</h2>
            <Link href={ROUTES.PLANS} className="text-xs text-accent hover:underline">
              Ver tudo
            </Link>
          </div>
          <div className="mt-4 rounded-xl border border-border/40 bg-card/30">
            {recentPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Nenhuma actividade recente
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Crie o seu primeiro plano para começar
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-border/60"
                  asChild
                >
                  <Link href={ROUTES.PLANS_NEW}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Criar plano
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {recentPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={ROUTES.PLANS}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      {plan.status === 'APPROVED' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{plan.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {TYPE_LABELS[plan.type] ?? plan.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {STATUS_LABELS[plan.status] ?? plan.status}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(plan.createdAt).toLocaleDateString('pt-AO')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold sm:text-base">Assistente IA Pronto</h3>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Insira uma dosificação e deixe a IA gerar todos os planos automaticamente.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 sm:shrink-0"
            asChild
          >
            <Link href={ROUTES.PLANO_ANUAL_NEW}>
              Inserir Dosificação
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
