'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  FileText,
  Sparkles,
  Eye,
  CheckCircle2,
  Clock,
  Loader2,
  Target,
  BookOpen,
  Lightbulb,
  ClipboardList,
  Pencil,
  Trash2,
  Download,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { Save, X } from 'lucide-react'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { exportPlanToPDF } from '@/src/shared/utils/pdf-export'
import { exportPlanToWord } from '@/src/shared/utils/word-export'
import { exportPlanToExcel } from '@/src/shared/utils/excel-export'
import { AdaptationInsights } from '@/src/ui/components/plans/AdaptationInsights'
import { PedagogicalTimeline } from '@/src/ui/components/plans/PedagogicalTimeline'
import { AIExplanationPanel } from '@/src/ui/components/plans/AIExplanationPanel'
import { AutoAdjustToggle } from '@/src/ui/components/plans/AutoAdjustToggle'

type PlanStatus = 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEWED' | 'APPROVED'
type PlanType = 'ANNUAL' | 'TRIMESTER' | 'BIWEEKLY' | 'LESSON'

interface PlanDetail {
  id: string
  title: string
  type: PlanType
  subject: string
  grade: string
  academicYear: string
  trimester?: number
  status: PlanStatus
  parentPlanId?: string
  dosificacaoId: string
  allowAutoAdjustments?: boolean
  content: {
    generalObjectives?: string[]
    specificObjectives?: string[]
    objectives?: string[]
    competencies?: string[]
    topics?: { title: string; subtopics?: string[]; duration?: string; week?: number }[]
    methodology?: string | Record<string, unknown>
    resources?: string[]
    assessment?: string | Record<string, unknown>
    observations?: string
    topic?: string
    duration?: number
    lessonPhases?: { name: string; duration: string; activities: string[]; content?: string; methods?: string; resources?: string; assessment?: string }[]
    homework?: string
    lessonType?: string
    lessonNumber?: number
    didacticUnit?: string
    summary?: string
    bibliography?: string[]
    criticalNotes?: string
  }
  createdAt: string
  updatedAt: string
  teacher?: {
    name: string
    school?: string
  }
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  DRAFT: { label: 'Rascunho', icon: FileText, className: 'bg-secondary text-secondary-foreground' },
  GENERATING: { label: 'A gerar...', icon: Clock, className: 'bg-yellow-500/10 text-yellow-500' },
  GENERATED: { label: 'Gerado', icon: Sparkles, className: 'bg-accent/10 text-accent' },
  REVIEWED: { label: 'Revisto', icon: Eye, className: 'bg-blue-500/10 text-blue-500' },
  APPROVED: { label: 'Aprovado', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500' },
}

const TYPE_CONFIG: Record<PlanType, { label: string; icon: typeof Calendar; backHref: string }> = {
  ANNUAL: { label: 'Dosificação Anual', icon: Calendar, backHref: ROUTES.PLANS_ANNUAL },
  TRIMESTER: { label: 'Dosificação Trimestral', icon: CalendarDays, backHref: ROUTES.PLANS_TRIMESTER },
  BIWEEKLY: { label: 'Dosificação Quinzenal', icon: CalendarRange, backHref: ROUTES.PLANS_BIWEEKLY },
  LESSON: { label: 'Plano de Aula', icon: GraduationCap, backHref: ROUTES.PLANS_LESSON },
}

export default function PlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [plan, setPlan] = useState<PlanDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_ROUTES.PLANS}/${params.id}`)
      const data = await res.json()
      if (res.ok && data.data) {
        setPlan(data.data)
        return data.data as PlanDetail
      } else {
        setError(data.error?.message || 'Plano não encontrado')
      }
    } catch {
      setError('Erro ao carregar plano')
    } finally {
      setIsLoading(false)
    }
    return null
  }, [params.id])

  // Initial fetch
  useEffect(() => {
    if (params.id) fetchPlan()
  }, [params.id, fetchPlan])

  // Poll while GENERATING
  useEffect(() => {
    if (plan?.status === 'GENERATING') {
      pollingRef.current = setInterval(async () => {
        const updated = await fetchPlan()
        if (updated && updated.status !== 'GENERATING') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }, 3000)
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [plan?.status, fetchPlan])

  async function handleUpdateStatus(status: PlanStatus) {
    if (!plan) return
    try {
      const res = await fetchWithAuth(API_ROUTES.PLANS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, status }),
      })
      if (res.ok) {
        setPlan(prev => prev ? { ...prev, status } : null)
      }
    } catch {
      // ignore
    }
  }

  async function handleDelete() {
    if (!plan) return
    try {
      const res = await fetchWithAuth(`${API_ROUTES.PLANS}?id=${plan.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push(TYPE_CONFIG[plan.type].backHref)
      }
    } catch {
      // ignore
    }
  }

  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(section: string, currentValue: string) {
    setEditing(section)
    setEditValue(currentValue)
  }

  function cancelEdit() {
    setEditing(null)
    setEditValue('')
  }

  async function saveEdit(section: string) {
    if (!plan) return
    setSaving(true)
    try {
      const updatedContent = { ...plan.content }

      // Parse based on section type
      if (section === 'generalObjectives' || section === 'specificObjectives' || section === 'competencies' || section === 'resources' || section === 'bibliography') {
        (updatedContent as Record<string, unknown>)[section] = editValue.split('\n').filter(l => l.trim())
      } else if (section === 'topics') {
        // Parse text format: title lines + "  - subtopic" lines, separated by blank lines
        const blocks = editValue.split(/\n\s*\n/).filter(b => b.trim())
        updatedContent.topics = blocks.map(block => {
          const lines = block.split('\n').filter(l => l.trim())
          const title = lines[0]?.trim() || ''
          const subtopics = lines.slice(1).filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''))
          return { title, subtopics }
        })
      } else if (section === 'lessonPhases') {
        // Parse: "## Name (duration)" + "- activity" lines, separated by blank lines
        const blocks = editValue.split(/\n\s*\n/).filter(b => b.trim())
        updatedContent.lessonPhases = blocks.map(block => {
          const lines = block.split('\n').filter(l => l.trim())
          const header = lines[0]?.trim() || ''
          const match = header.match(/^##\s*(.+?)\s*\(([^)]+)\)\s*$/)
          const name = match ? match[1] : header.replace(/^##\s*/, '')
          const duration = match ? match[2] : ''
          const activities = lines.slice(1).filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''))
          return { name, duration, activities }
        })
      } else if (section === 'methodology' || section === 'assessment') {
        // Try parsing as JSON (object), fall back to string
        try {
          const parsed = JSON.parse(editValue)
          ;(updatedContent as Record<string, unknown>)[section] = parsed
        } catch {
          (updatedContent as Record<string, unknown>)[section] = editValue
        }
      } else {
        (updatedContent as Record<string, unknown>)[section] = editValue
      }

      const res = await fetchWithAuth(API_ROUTES.PLANS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, content: updatedContent }),
      })
      if (res.ok) {
        setPlan(prev => prev ? { ...prev, content: updatedContent } : null)
        setEditing(null)
        setEditValue('')
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">{error || 'Plano não encontrado'}</h2>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={ROUTES.PLANS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos Planos
          </Link>
        </Button>
      </div>
    )
  }

  const typeCfg = TYPE_CONFIG[plan.type]
  const statusCfg = STATUS_CONFIG[plan.status]
  const StatusIcon = statusCfg.icon
  const TypeIcon = typeCfg.icon
  const content = plan.content

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href={typeCfg.backHref}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar a {typeCfg.label}is
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <TypeIcon className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{plan.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="accent">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {plan.grade}
                </Badge>
                <Badge variant="secondary">{plan.subject}</Badge>
                <Badge variant="secondary">{plan.academicYear}</Badge>
                <Badge className={statusCfg.className}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {statusCfg.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(plan.status === 'GENERATED' || plan.status === 'REVIEWED') && (
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => handleUpdateStatus('APPROVED')}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Aprovar
              </Button>
            )}
            {(plan.type === 'LESSON' || plan.type === 'TRIMESTER' || plan.type === 'BIWEEKLY' || plan.type === 'ANNUAL') && (
              <Button size="sm" variant="outline" className="border-border/60" asChild>
                <Link href={`/plans/${plan.id}/template`}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Ver Modelo Oficial
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-border/60"
              onClick={() => exportPlanToPDF(plan)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
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
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Tipo</div>
          <div className="mt-1 text-sm font-semibold">{typeCfg.label}</div>
        </div>
        {content.topic && (
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <div className="text-xs text-muted-foreground">Tema</div>
            <div className="mt-1 text-sm font-semibold">{content.topic}</div>
          </div>
        )}
        {content.duration && (
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <div className="text-xs text-muted-foreground">Duração</div>
            <div className="mt-1 text-sm font-semibold">{content.duration} min</div>
          </div>
        )}
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Objectivos</div>
          <div className="mt-1 text-sm font-semibold">
            {((content.generalObjectives?.length ?? 0) + (content.specificObjectives?.length ?? 0)) || (content.objectives?.length ?? 0)}
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Temas</div>
          <div className="mt-1 text-sm font-semibold">{content.topics?.length ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="text-xs text-muted-foreground">Criado</div>
          <div className="mt-1 text-sm font-semibold">{new Date(plan.createdAt).toLocaleDateString('pt-AO')}</div>
        </div>
      </div>

      {/* AI Intelligence Section */}
      {plan.status !== 'DRAFT' && plan.status !== 'GENERATING' && (
        <div className="space-y-4">
          {/* Headline */}
          <div className="rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Este plano foi optimizado automaticamente</h2>
                  <p className="text-xs text-muted-foreground">Com base no seu histórico de aulas e calendário escolar</p>
                </div>
              </div>
              <AutoAdjustToggle
                planId={plan.id}
                initialValue={plan.allowAutoAdjustments ?? true}
              />
            </div>
          </div>
          <AdaptationInsights planId={plan.id} />
          <PedagogicalTimeline planId={plan.id} />
          <AIExplanationPanel planId={plan.id} />
        </div>
      )}

      {/* General Objectives */}
      {content.generalObjectives && content.generalObjectives.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Objectivos Gerais</h2>
            </div>
            {editing !== 'generalObjectives' && (
              <button onClick={() => startEdit('generalObjectives', content.generalObjectives!.join('\n'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'generalObjectives' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Um objectivo por linha" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('generalObjectives')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {content.generalObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">{i + 1}</span>
                  {obj}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Specific Objectives */}
      {content.specificObjectives && content.specificObjectives.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <h2 className="text-base font-semibold">Objectivos Específicos</h2>
            </div>
            {editing !== 'specificObjectives' && (
              <button onClick={() => startEdit('specificObjectives', content.specificObjectives!.join('\n'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'specificObjectives' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Um objectivo por linha" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('specificObjectives')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {content.specificObjectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-xs font-medium text-green-500">{i + 1}</span>
                  {obj}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Legacy objectives fallback */}
      {!content.generalObjectives?.length && !content.specificObjectives?.length && content.objectives && content.objectives.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold">Objectivos</h2>
          </div>
          <ul className="space-y-2">
            {content.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                  {i + 1}
                </span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competencies */}
      {content.competencies && content.competencies.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Competências</h2>
            </div>
            {editing !== 'competencies' && (
              <button onClick={() => startEdit('competencies', content.competencies!.join('\n'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'competencies' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Uma competência por linha" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('competencies')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {content.competencies.map((comp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {comp}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Topics */}
      {content.topics && content.topics.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Temas</h2>
            </div>
            {editing !== 'topics' && (
              <button onClick={() => startEdit('topics', content.topics!.map(t => `${t.title}${t.subtopics?.length ? '\n' + t.subtopics.map(s => `  - ${s}`).join('\n') : ''}`).join('\n\n'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'topics' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder={'Tema 1\n  - Subtema A\n  - Subtema B\n\nTema 2\n  - Subtema C'} />
              <p className="text-xs text-muted-foreground">Formato: título do tema numa linha, subtemas com &quot;  - &quot; no início. Separe temas com uma linha em branco.</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('topics')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {content.topics.map((topic, i) => (
                <div key={i} className="rounded-lg border border-border/30 bg-background/50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{topic.title}</h3>
                    <div className="flex items-center gap-2">
                      {topic.week && (
                        <Badge variant="secondary" className="text-xs">
                          Semana {topic.week}
                        </Badge>
                      )}
                      {topic.duration && (
                        <Badge variant="secondary" className="text-xs">
                          {topic.duration}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {topic.subtopics && topic.subtopics.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-4">
                      {topic.subtopics.map((sub, j) => (
                        <li key={j} className="text-xs text-muted-foreground list-disc">
                          {sub}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lesson Phases (Desenvolvimento da Aula) */}
      {content.lessonPhases && content.lessonPhases.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Desenvolvimento da Aula</h2>
            </div>
            {editing !== 'lessonPhases' && (
              <button onClick={() => startEdit('lessonPhases', content.lessonPhases!.map(p => `## ${p.name} (${p.duration})\n${p.activities.map(a => `- ${a}`).join('\n')}`).join('\n\n'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'lessonPhases' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[250px] focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder={'## Introdução (10 min)\n- Actividade 1\n- Actividade 2\n\n## Desenvolvimento (25 min)\n- Actividade 3'} />
              <p className="text-xs text-muted-foreground">Formato: &quot;## Nome da Fase (duração)&quot; seguido de actividades com &quot;- &quot;. Separe fases com linha em branco.</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('lessonPhases')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
          <div className="space-y-4">
            {content.lessonPhases.map((phase, i) => (
              <div key={i} className="rounded-lg border border-border/30 bg-background/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    {phase.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {phase.duration}
                  </Badge>
                </div>
                <ul className="space-y-1 pl-8">
                  {phase.activities.map((act, j) => (
                    <li key={j} className="text-sm text-muted-foreground list-disc">
                      {act}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Methodology */}
      {content.methodology && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Metodologia</h2>
            </div>
            {editing !== 'methodology' && (
              <button onClick={() => startEdit('methodology', typeof content.methodology === 'string' ? content.methodology : JSON.stringify(content.methodology, null, 2))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'methodology' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Descreva a metodologia" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('methodology')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : typeof content.methodology === 'string' ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">{content.methodology}</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(content.methodology as Record<string, string>).map(([key, value]) => (
                <div key={key}>
                  <h3 className="text-sm font-semibold mb-1">{key}</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resources */}
      {content.resources && content.resources.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Recursos</h2>
            </div>
            {editing !== 'resources' && (
              <button onClick={() => startEdit('resources', content.resources!.join('\n'))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'resources' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Um recurso por linha" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('resources')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {content.resources.map((resource, i) => (
                <Badge key={i} variant="secondary">
                  {resource}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assessment */}
      {content.assessment && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Avaliação</h2>
            </div>
            {editing !== 'assessment' && (
              <button onClick={() => startEdit('assessment', typeof content.assessment === 'string' ? content.assessment : JSON.stringify(content.assessment, null, 2))} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'assessment' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Descreva a avaliação" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('assessment')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : typeof content.assessment === 'string' ? (
            <p className="text-sm leading-relaxed whitespace-pre-line">{content.assessment}</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(content.assessment as Record<string, string>).map(([key, value]) => (
                <div key={key}>
                  <h3 className="text-sm font-semibold mb-1">{key}</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Observations */}
      {content.observations && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Observações</h2>
            </div>
            {editing !== 'observations' && (
              <button onClick={() => startEdit('observations', content.observations!)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'observations' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Observações" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('observations')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-line">{content.observations}</p>
          )}
        </div>
      )}

      {/* Homework */}
      {content.homework && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-accent" />
              <h2 className="text-base font-semibold">Tarefa para Casa</h2>
            </div>
            {editing !== 'homework' && (
              <button onClick={() => startEdit('homework', content.homework!)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editing === 'homework' ? (
            <div className="space-y-3">
              <textarea className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/40" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Tarefa para casa" />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="mr-1 h-3.5 w-3.5" />Cancelar</Button>
                <Button size="sm" className="bg-accent text-accent-foreground" onClick={() => saveEdit('homework')} disabled={saving}><Save className="mr-1 h-3.5 w-3.5" />{saving ? 'A guardar...' : 'Guardar'}</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-line">{content.homework}</p>
          )}
        </div>
      )}

      {/* Generating state */}
      {plan.status === 'GENERATING' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-accent/20 bg-accent/5 px-4 py-16 text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
              <Sparkles className="h-10 w-10 text-accent animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
              <Loader2 className="h-5 w-5 text-accent animate-spin" />
            </div>
          </div>
          <h3 className="mt-6 text-lg font-semibold">A IA está a analisar e planear...</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            Estamos a cruzar o calendário escolar, os conteúdos da dosificação e o seu histórico para criar o melhor plano possível.
          </p>
          <div className="mt-6 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              A página actualiza-se automaticamente
            </div>
          </div>
        </div>
      )}

      {/* Empty content state */}
      {plan.status === 'DRAFT' && !content.generalObjectives?.length && !content.specificObjectives?.length && !content.objectives?.length && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-14 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <Sparkles className="h-8 w-8 text-accent" />
          </div>
          <h3 className="mt-5 text-base font-semibold">Este plano está à espera da IA</h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
            A IA vai gerar objectivos, conteúdos e metodologia com base na sua dosificação e calendário escolar.
          </p>
          <Button className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href={ROUTES.PLANS_NEW}>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar plano com IA
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
