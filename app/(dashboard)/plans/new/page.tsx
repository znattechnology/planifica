'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  GraduationCap,
  Sparkles,
  Loader2,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Select } from '@/src/ui/components/ui/select'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Textarea } from '@/src/ui/components/ui/textarea'
import { Badge } from '@/src/ui/components/ui/badge'
import { FormAlert } from '@/src/ui/components/ui/form-error'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { useSubscription } from '@/src/ui/providers/subscription-provider'
import { ArrowUpCircle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────

interface DosificacaoOption {
  id: string
  title: string
  subject: string
  grade: string
  academicYear: string
  content: {
    unidades?: { nome: string; topicos: unknown[] }[]
    horasSemanais?: number
    totalHoras?: number
    numAulas?: number
  }
}

interface PlanOption {
  id: string
  title: string
  subject: string
  grade: string
  type: string
  status: string
}

type PlanType = 'ANNUAL' | 'TRIMESTER' | 'BIWEEKLY' | 'LESSON'

const PLAN_TYPES: { value: PlanType; label: string; description: string; icon: typeof Calendar }[] = [
  {
    value: 'ANNUAL',
    label: 'Dosificação Anual',
    description: 'Dosificação geral do ano lectivo baseada no plano anual da disciplina',
    icon: Calendar,
  },
  {
    value: 'TRIMESTER',
    label: 'Dosificação Trimestral',
    description: 'Detalhamento da dosificação por trimestre',
    icon: CalendarDays,
  },
  {
    value: 'BIWEEKLY',
    label: 'Dosificação Quinzenal',
    description: 'Organização quinzenal das actividades',
    icon: CalendarRange,
  },
  {
    value: 'LESSON',
    label: 'Plano de Aula',
    description: 'Plano detalhado para uma aula específica',
    icon: GraduationCap,
  },
]

// ─── Component ───────────────────────────────────────────

export default function NewPlanPage() {
  const router = useRouter()
  const { usage } = useSubscription()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Step 1: Plan type
  const [planType, setPlanType] = useState<PlanType>('ANNUAL')

  // Step 2: Source selection
  const [dosificacoes, setDosificacoes] = useState<DosificacaoOption[]>([])
  const [parentPlans, setParentPlans] = useState<PlanOption[]>([])
  const [selectedDosificacao, setSelectedDosificacao] = useState('')
  const [selectedParentPlan, setSelectedParentPlan] = useState('')
  const [isLoadingSources, setIsLoadingSources] = useState(false)

  // Step 3: Configuration
  const [title, setTitle] = useState('')
  const [trimester, setTrimester] = useState('1')
  const [week, setWeek] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')

  // Fetch dosificações or parent plans based on plan type
  useEffect(() => {
    async function fetchSources() {
      setIsLoadingSources(true)
      try {
        if (planType === 'ANNUAL') {
          const res = await fetchWithAuth(API_ROUTES.PLANO_ANUAL)
          const data = await res.json()
          if (res.ok && data.data) {
            setDosificacoes(data.data)
          }
        } else {
          // Fetch parent plans of the appropriate type
          const parentType = planType === 'TRIMESTER' ? 'ANNUAL' : planType === 'BIWEEKLY' ? 'TRIMESTER' : 'BIWEEKLY'
          const res = await fetchWithAuth(`${API_ROUTES.PLANS}?type=${parentType}`)
          const data = await res.json()
          if (res.ok && data.data) {
            const items = Array.isArray(data.data) ? data.data : data.data.data || []
            setParentPlans(items)
          }
          // Also fetch dosificações for context
          const dosRes = await fetchWithAuth(API_ROUTES.PLANO_ANUAL)
          const dosData = await dosRes.json()
          if (dosRes.ok && dosData.data) {
            setDosificacoes(dosData.data)
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingSources(false)
      }
    }
    fetchSources()
  }, [planType])

  // Auto-generate title
  useEffect(() => {
    if (planType === 'ANNUAL' && selectedDosificacao) {
      const dos = dosificacoes.find(d => d.id === selectedDosificacao)
      if (dos) {
        setTitle(`Dosificação Anual - ${dos.subject} ${dos.grade} ${dos.academicYear}`)
      }
    } else if (selectedParentPlan) {
      const parent = parentPlans.find(p => p.id === selectedParentPlan)
      if (parent) {
        const typeLabel = planType === 'TRIMESTER' ? `Trimestral ${trimester}º Trim.` : planType === 'BIWEEKLY' ? `Quinzenal` : 'de Aula'
        const prefix = planType === 'LESSON' ? 'Plano' : 'Dosificação'
        setTitle(`${prefix} ${typeLabel} - ${parent.subject} ${parent.grade}`)
      }
    }
  }, [planType, selectedDosificacao, selectedParentPlan, trimester, dosificacoes, parentPlans])

  const selectedDos = dosificacoes.find(d => d.id === selectedDosificacao)
  const needsDosificacao = planType === 'ANNUAL'

  const canProceedStep2 = needsDosificacao ? !!selectedDosificacao : !!selectedParentPlan
  const canProceedStep3 = !!title

  // Derived state: is user at the free plan limit?
  const isAtLimit =
    usage?.plan === 'FREE' &&
    typeof usage.remaining === 'number' &&
    usage.remaining <= 0

  async function handleGenerate() {
    setError('')

    // Guard: FREE plan limit reached
    if (isAtLimit) {
      setError('Atingiu o limite de 5 planos mensais do plano gratuito. Faça upgrade para Premium para continuar.')
      return
    }

    setIsGenerating(true)
    try {
      const payload: Record<string, unknown> = {
        type: planType,
        title,
        dosificacaoId: selectedDosificacao || undefined,
        parentPlanId: selectedParentPlan || undefined,
        additionalContext: additionalContext || undefined,
      }

      if (planType === 'TRIMESTER' || planType === 'BIWEEKLY') {
        payload.trimester = Number(trimester)
      }
      if (planType === 'BIWEEKLY' || planType === 'LESSON') {
        payload.week = week ? Number(week) : undefined
      }

      const res = await fetchWithAuth(API_ROUTES.PLANS_GENERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao gerar plano')

      // Redirect to the generated plan's detail page
      if (data.data?.id) {
        router.push(`/plans/${data.data.id}`)
      } else {
        const routes: Record<PlanType, string> = {
          ANNUAL: ROUTES.PLANS_ANNUAL,
          TRIMESTER: ROUTES.PLANS_TRIMESTER,
          BIWEEKLY: ROUTES.PLANS_BIWEEKLY,
          LESSON: ROUTES.PLANS_LESSON,
        }
        router.push(routes[planType])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href={ROUTES.PLANS}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos planos
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gerar com IA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A IA gera a dosificação ou plano automaticamente com base no plano anual da disciplina e no calendário escolar.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                s < step
                  ? 'bg-accent text-accent-foreground'
                  : s === step
                  ? 'bg-accent/20 text-accent ring-2 ring-accent/30'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`hidden sm:block h-px w-12 ${s < step ? 'bg-accent' : 'bg-border'}`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {step === 1 && 'Tipo de plano'}
          {step === 2 && 'Fonte de dados'}
          {step === 3 && 'Configuração e geração'}
        </span>
      </div>

      {error && <FormAlert message={error} />}

      {/* ═══ STEP 1: Plan Type ═══ */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">O que deseja gerar?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PLAN_TYPES.map(pt => {
              const Icon = pt.icon
              const isSelected = planType === pt.value
              return (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPlanType(pt.value)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                      : 'border-border/40 bg-card/50 hover:border-accent/30 hover:bg-card/80'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-accent/20' : 'bg-secondary'}`}>
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{pt.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{pt.description}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Source Selection ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">
            {needsDosificacao ? 'Selecione o plano anual da disciplina' : 'Selecione a dosificação pai'}
          </h2>

          {isLoadingSources ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : needsDosificacao ? (
            <>
              {dosificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">Nenhum plano anual da disciplina encontrado</p>
                  <p className="mt-1 text-xs text-muted-foreground">Crie um plano anual da disciplina primeiro.</p>
                  <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90" size="sm" asChild>
                    <Link href={ROUTES.PLANO_ANUAL_NEW}>Criar Plano Anual da Disciplina</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dosificacoes.map(dos => (
                    <button
                      key={dos.id}
                      type="button"
                      onClick={() => setSelectedDosificacao(dos.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        selectedDosificacao === dos.id
                          ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                          : 'border-border/40 bg-card/50 hover:border-accent/30'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <BookOpen className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{dos.title}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">{dos.subject}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{dos.grade}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{dos.content?.unidades?.length ?? 0} unidades</Badge>
                          {dos.content?.horasSemanais && <Badge variant="secondary" className="text-[10px]">{dos.content.horasSemanais}h/semana</Badge>}
                        </div>
                      </div>
                      {selectedDosificacao === dos.id && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {parentPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-12 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium">Nenhuma dosificação pai encontrada</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gere primeiro uma dosificação {planType === 'TRIMESTER' ? 'anual' : planType === 'BIWEEKLY' ? 'trimestral' : 'quinzenal'}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parentPlans.map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedParentPlan(plan.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        selectedParentPlan === plan.id
                          ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                          : 'border-border/40 bg-card/50 hover:border-accent/30'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        <Calendar className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{plan.title}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">{plan.subject}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{plan.grade}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{plan.status}</Badge>
                        </div>
                      </div>
                      {selectedParentPlan === plan.id && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Also select dosificação for context */}
              {dosificacoes.length > 0 && (
                <div className="space-y-2">
                  <Label>Plano anual da disciplina associado (opcional)</Label>
                  <Select
                    value={selectedDosificacao}
                    onChange={e => setSelectedDosificacao(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {dosificacoes.map(dos => (
                      <option key={dos.id} value={dos.id}>
                        {dos.title}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Config & Generate ═══ */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold">Configurar e gerar</h2>

          {/* Summary Card */}
          {selectedDos && planType === 'ANNUAL' && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">Plano anual da disciplina seleccionado</span>
              </div>
              <p className="text-sm">{selectedDos.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">{selectedDos.subject}</Badge>
                <Badge variant="secondary" className="text-[10px]">{selectedDos.grade}</Badge>
                <Badge variant="secondary" className="text-[10px]">{selectedDos.content?.unidades?.length ?? 0} unidades</Badge>
                {selectedDos.content?.horasSemanais && <Badge variant="secondary" className="text-[10px]">{selectedDos.content.horasSemanais}h/semana</Badge>}
                {selectedDos.content?.totalHoras && <Badge variant="secondary" className="text-[10px]">{selectedDos.content.totalHoras}h totais</Badge>}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Título do plano</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Dosificação Anual - Matemática 10ª Classe"
              />
            </div>

            {/* Trimester (for trimester/biweekly) */}
            {(planType === 'TRIMESTER' || planType === 'BIWEEKLY') && (
              <div className="space-y-2">
                <Label>Trimestre</Label>
                <Select value={trimester} onChange={e => setTrimester(e.target.value)}>
                  <option value="1">1º Trimestre</option>
                  <option value="2">2º Trimestre</option>
                  <option value="3">3º Trimestre</option>
                </Select>
              </div>
            )}

            {/* Week (for biweekly/lesson) */}
            {(planType === 'BIWEEKLY' || planType === 'LESSON') && (
              <div className="space-y-2">
                <Label>Semana (opcional)</Label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={week}
                  onChange={e => setWeek(e.target.value)}
                  placeholder="Ex: 3"
                />
              </div>
            )}

            {/* Additional context */}
            <div className="space-y-2">
              <Label>Contexto adicional para a IA (opcional)</Label>
              <Textarea
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
                placeholder="Ex: Turma com dificuldades em álgebra, focar nos exercícios práticos..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Adicione informações que ajudem a IA a gerar um plano mais adequado à sua realidade.
              </p>
            </div>
          </div>

          {/* Usage gate banner (FREE limit reached) */}
          {isAtLimit && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <Sparkles className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">Limite mensal atingido</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Usou os {usage?.plansLimit} planos gratuitos deste mês.
                    Faça upgrade para gerar planos ilimitados.
                  </p>
                </div>
              </div>
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                size="sm"
                asChild
              >
                <Link href={ROUTES.DASHBOARD}>
                  <ArrowUpCircle className="mr-2 h-3.5 w-3.5" />
                  Upgrade para Premium
                </Link>
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canProceedStep3 || isGenerating || isAtLimit}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A gerar plano com IA...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Gerar Plano com IA
                  {usage?.plan === 'FREE' && typeof usage.remaining === 'number' && !isAtLimit && (
                    <span className="ml-2 rounded-full bg-accent-foreground/20 px-1.5 py-0.5 text-[10px]">
                      {usage.remaining} restantes
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
