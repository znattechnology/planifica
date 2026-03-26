'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  BarChart3,
  FileText,
  GraduationCap,
  Calendar,
  Sparkles,
  BookOpen,
  Target,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Loader2,
  CalendarDays,
  Eye,
  Plus,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Textarea } from '@/src/ui/components/ui/textarea'
import { Select } from '@/src/ui/components/ui/select'
import { Badge } from '@/src/ui/components/ui/badge'
import { FormError, FormAlert } from '@/src/ui/components/ui/form-error'
import { reportSchema, type ReportFormData } from '@/src/application/validators/report.validator'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'

const SUBJECTS = [
  'Matemática',
  'Física',
  'Química',
  'Biologia',
  'Língua Portuguesa',
  'Inglês',
  'Francês',
  'História',
  'Geografia',
  'Filosofia',
  'Educação Visual',
  'Educação Física',
  'Informática',
  'Empreendedorismo',
]

const GRADES = [
  '1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe', '5ª Classe',
  '6ª Classe', '7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe',
  '11ª Classe', '12ª Classe', '13ª Classe',
]

interface TrimesterReportSummary {
  id: string
  trimester: number
  status: string
  lessonsDelivered: number
  hoursWorked: number
  topicsCovered: number
  plannedVsDelivered: number
  objectivesAchieved: number
  objectivesPartial: number
  objectivesNotAchieved: number
}

const TRIMESTER_LABELS: Record<number, string> = {
  1: '1º Trimestre',
  2: '2º Trimestre',
  3: '3º Trimestre',
}

type Step = 'config' | 'generating' | 'done'

export default function NewReportPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('config')
  const [serverError, setServerError] = useState('')
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null)
  const [trimesterReports, setTrimesterReports] = useState<TrimesterReportSummary[]>([])
  const [loadingReports, setLoadingReports] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: 'ANNUAL',
      subject: '',
      grade: '',
      academicYear: '2025',
      trimester: '1',
      additionalContext: '',
    },
  })

  const reportType = watch('reportType')
  const subject = watch('subject')
  const grade = watch('grade')
  const academicYear = watch('academicYear')

  // Buscar relatórios trimestrais existentes quando subject/grade/year mudam (para o anual)
  const fetchTrimesterReports = useCallback(async () => {
    if (!subject || !grade || !academicYear || reportType !== 'ANNUAL') {
      setTrimesterReports([])
      return
    }
    setLoadingReports(true)
    try {
      const res = await fetch(`${API_ROUTES.REPORTS}?type=TRIMESTER`)
      const data = await res.json()
      if (res.ok && data.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relevant = (data.data as any[])
          .filter((r) => r.subject === subject && r.grade === grade && r.academicYear === academicYear)
          .map((r) => {
            const stats = r.content?.statistics || {}
            const objectives = r.content?.objectivesAchieved || []
            return {
              id: r.id,
              trimester: r.period?.trimester || 0,
              status: r.status,
              lessonsDelivered: stats.totalLessonsDelivered || 0,
              hoursWorked: stats.totalHoursWorked || 0,
              topicsCovered: stats.totalTopicsCovered || 0,
              plannedVsDelivered: stats.plannedVsDelivered || 0,
              objectivesAchieved: objectives.filter((o: { status: string }) => o.status === 'achieved').length,
              objectivesPartial: objectives.filter((o: { status: string }) => o.status === 'partial').length,
              objectivesNotAchieved: objectives.filter((o: { status: string }) => o.status === 'not_achieved').length,
            }
          })
        setTrimesterReports(relevant)
      }
    } catch {
      // silently fail
    } finally {
      setLoadingReports(false)
    }
  }, [subject, grade, academicYear, reportType])

  useEffect(() => {
    fetchTrimesterReports()
  }, [fetchTrimesterReports])

  const relevantTrimesterReports = trimesterReports

  const finalizedCount = relevantTrimesterReports.filter(
    (r) => r.status === 'FINALIZED',
  ).length

  // Totais consolidados
  const totals = relevantTrimesterReports.reduce(
    (acc, r) => ({
      lessons: acc.lessons + r.lessonsDelivered,
      hours: acc.hours + r.hoursWorked,
      topics: acc.topics + r.topicsCovered,
      achieved: acc.achieved + r.objectivesAchieved,
      partial: acc.partial + r.objectivesPartial,
      notAchieved: acc.notAchieved + r.objectivesNotAchieved,
    }),
    { lessons: 0, hours: 0, topics: 0, achieved: 0, partial: 0, notAchieved: 0 },
  )

  const avgPlannedVsDelivered =
    relevantTrimesterReports.length > 0
      ? Math.round(
          relevantTrimesterReports.reduce((sum, r) => sum + r.plannedVsDelivered, 0) /
            relevantTrimesterReports.length,
        )
      : 0

  async function onSubmit(data: ReportFormData) {
    setServerError('')
    if (data.reportType === 'ANNUAL' && finalizedCount < 1) {
      setServerError('É necessário pelo menos um relatório trimestral finalizado para gerar o relatório anual.')
      return
    }
    setStep('generating')
    try {
      const res = await fetch(API_ROUTES.REPORTS_GENERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.reportType,
          subject: data.subject,
          grade: data.grade,
          academicYear: data.academicYear,
          trimester: data.reportType === 'TRIMESTER' ? Number(data.trimester) : undefined,
          additionalContext: data.additionalContext || undefined,
        }),
      })
      const result = await res.json()
      if (res.ok && result.data) {
        setGeneratedReportId(result.data.id)
        setStep('done')
      } else {
        setStep('config')
        setServerError(result.error?.message || 'Não foi possível gerar o relatório. Tente novamente.')
      }
    } catch {
      setStep('config')
      setServerError('Não foi possível gerar o relatório. Tente novamente.')
    }
  }

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <Sparkles className="h-10 w-10 text-accent" />
          </div>
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
        </div>
        <h2 className="mt-6 text-xl font-bold">A gerar relatório {reportType === 'ANNUAL' ? 'anual' : 'trimestral'}...</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          A IA está a analisar as suas aulas, planos e actividades para criar um relatório
          completo. Isto pode demorar alguns segundos.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-sm text-muted-foreground">A processar dados...</span>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="mt-6 text-xl font-bold">Relatório gerado com sucesso!</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          O relatório {reportType === 'ANNUAL' ? 'anual' : 'trimestral'} de {subject} — {grade} foi gerado. Revise o
          conteúdo e finalize quando estiver satisfeito.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => router.push(reportType === 'ANNUAL' ? ROUTES.REPORTS_ANNUAL : ROUTES.REPORTS_TRIMESTER)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver Relatórios
          </Button>
          <Button variant="outline" className="border-border/60" asChild>
            <Link href={ROUTES.REPORTS_NEW}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Outro
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href={ROUTES.REPORTS}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos relatórios
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gerar Relatório</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure os parâmetros e a IA gerará um relatório completo com estatísticas e análise.
        </p>
      </div>

      {/* Server Error */}
      {serverError && <FormAlert message={serverError} />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Report Type Selection */}
        <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <FileText className="h-4 w-4 text-accent" />
            </div>
            <h2 className="text-base font-semibold">Tipo de Relatório</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setValue('reportType', 'TRIMESTER')}
              className={`rounded-xl border p-4 text-left transition-all ${
                reportType === 'TRIMESTER'
                  ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
                  : 'border-border/40 hover:border-accent/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <CalendarDays className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Relatório Trimestral</div>
                  <div className="text-xs text-muted-foreground">
                    Análise detalhada de um trimestre
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setValue('reportType', 'ANNUAL')}
              className={`rounded-xl border p-4 text-left transition-all ${
                reportType === 'ANNUAL'
                  ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
                  : 'border-border/40 hover:border-accent/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <BarChart3 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Relatório Anual</div>
                  <div className="text-xs text-muted-foreground">
                    Consolidação de todo o ano lectivo
                  </div>
                </div>
              </div>
            </button>
          </div>
          <FormError message={errors.reportType?.message} />
        </section>

        {/* Configuration */}
        <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <GraduationCap className="h-4 w-4 text-accent" />
            </div>
            <h2 className="text-base font-semibold">Configuração</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Disciplina */}
            <div className="space-y-2">
              <Label htmlFor="subject">Disciplina</Label>
              <Select
                id="subject"
                aria-invalid={!!errors.subject}
                {...register('subject')}
              >
                <option value="">Selecione a disciplina</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <FormError message={errors.subject?.message} />
            </div>

            {/* Classe */}
            <div className="space-y-2">
              <Label htmlFor="grade">Classe</Label>
              <Select
                id="grade"
                aria-invalid={!!errors.grade}
                {...register('grade')}
              >
                <option value="">Selecione a classe</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Select>
              <FormError message={errors.grade?.message} />
            </div>

            {/* Ano Lectivo */}
            <div className="space-y-2">
              <Label htmlFor="academicYear">
                <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
                Ano Lectivo
              </Label>
              <Input
                id="academicYear"
                placeholder="2025"
                aria-invalid={!!errors.academicYear}
                {...register('academicYear')}
              />
              <FormError message={errors.academicYear?.message} />
            </div>

            {/* Trimestre (só para trimestral) */}
            {reportType === 'TRIMESTER' && (
              <div className="space-y-2">
                <Label htmlFor="trimester">
                  <CalendarDays className="mr-1.5 inline h-3.5 w-3.5" />
                  Trimestre
                </Label>
                <Select
                  id="trimester"
                  aria-invalid={!!errors.trimester}
                  {...register('trimester')}
                >
                  <option value="1">1º Trimestre</option>
                  <option value="2">2º Trimestre</option>
                  <option value="3">3º Trimestre</option>
                </Select>
                <FormError message={errors.trimester?.message} />
              </div>
            )}
          </div>
        </section>

        {/* Trimester Reports Preview (only for Annual) */}
        {reportType === 'ANNUAL' && subject && grade && (
          <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Relatórios Trimestrais Disponíveis</h2>
                <p className="text-xs text-muted-foreground">
                  O relatório anual consolida os dados dos relatórios trimestrais
                </p>
              </div>
            </div>

            {relevantTrimesterReports.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">
                    Nenhum relatório trimestral encontrado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Para {subject} — {grade}. Gere pelo menos um relatório trimestral primeiro para
                    obter um relatório anual mais completo.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Trimester cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((t) => {
                    const report = relevantTrimesterReports.find((r) => r.trimester === t)
                    return (
                      <div
                        key={t}
                        className={`rounded-lg border p-4 ${
                          report
                            ? report.status === 'FINALIZED'
                              ? 'border-green-500/20 bg-green-500/5'
                              : 'border-yellow-500/20 bg-yellow-500/5'
                            : 'border-border/30 bg-background/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold">{TRIMESTER_LABELS[t]}</span>
                          {report ? (
                            <Badge
                              className={
                                report.status === 'FINALIZED'
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-yellow-500/10 text-yellow-500'
                              }
                            >
                              {report.status === 'FINALIZED' ? 'Finalizado' : 'Gerado'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Não gerado</Badge>
                          )}
                        </div>
                        {report ? (
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Aulas:</span>
                              <span className="font-medium text-foreground">
                                {report.lessonsDelivered}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Horas:</span>
                              <span className="font-medium text-foreground">
                                {report.hoursWorked}h
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cumprimento:</span>
                              <span className="font-medium text-foreground">
                                {report.plannedVsDelivered}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Sem dados disponíveis
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Consolidated Totals */}
                <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-5">
                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                    <CalendarDays className="mx-auto h-4 w-4 text-accent mb-1" />
                    <div className="text-xl font-bold">{totals.lessons}</div>
                    <div className="text-[10px] text-muted-foreground">Aulas Total</div>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                    <Clock className="mx-auto h-4 w-4 text-accent mb-1" />
                    <div className="text-xl font-bold">{totals.hours}h</div>
                    <div className="text-[10px] text-muted-foreground">Horas Total</div>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                    <BookOpen className="mx-auto h-4 w-4 text-accent mb-1" />
                    <div className="text-xl font-bold">{totals.topics}</div>
                    <div className="text-[10px] text-muted-foreground">Temas</div>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                    <TrendingUp className="mx-auto h-4 w-4 text-accent mb-1" />
                    <div className="text-xl font-bold">{avgPlannedVsDelivered}%</div>
                    <div className="text-[10px] text-muted-foreground">Média Cumpr.</div>
                  </div>
                  <div className="rounded-lg border border-border/30 bg-background/50 p-3 text-center">
                    <Target className="mx-auto h-4 w-4 text-accent mb-1" />
                    <div className="text-xl font-bold">{totals.achieved}</div>
                    <div className="text-[10px] text-muted-foreground">Obj. Alcançados</div>
                  </div>
                </div>

                {/* Objectives bar */}
                {totals.achieved + totals.partial + totals.notAchieved > 0 && (
                  <div className="mt-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Objectivos Consolidados
                    </span>
                    <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                      <div
                        className="bg-green-500"
                        style={{
                          width: `${(totals.achieved / (totals.achieved + totals.partial + totals.notAchieved)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-yellow-500"
                        style={{
                          width: `${(totals.partial / (totals.achieved + totals.partial + totals.notAchieved)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-red-500"
                        style={{
                          width: `${(totals.notAchieved / (totals.achieved + totals.partial + totals.notAchieved)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">Alcançados: {totals.achieved}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                        <span className="text-muted-foreground">Parciais: {totals.partial}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">Não alcançados: {totals.notAchieved}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* Additional Context */}
        <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Lightbulb className="h-4 w-4 text-accent" />
            </div>
            <h2 className="text-base font-semibold">Contexto Adicional</h2>
            <Badge variant="secondary" className="text-[10px]">Opcional</Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Observações ou contexto extra para a IA</Label>
            <Textarea
              id="context"
              placeholder="Ex: Houve uma paralisação de 2 semanas no 2º trimestre que afectou o cumprimento do programa. Os alunos tiveram dificuldades em cálculo diferencial..."
              rows={4}
              {...register('additionalContext')}
            />
            <FormError message={errors.additionalContext?.message} />
            <p className="text-xs text-muted-foreground">
              Informações adicionais que a IA deve considerar ao gerar o relatório.
            </p>
          </div>
        </section>

        {/* What will be generated */}
        <section className="rounded-xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold">O que será gerado</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: FileText, label: 'Sumário Executivo', desc: 'Resumo geral do período' },
              { icon: Target, label: 'Análise de Objectivos', desc: 'Alcançados, parciais e não alcançados' },
              { icon: BookOpen, label: 'Temas Leccionados', desc: 'Cobertura e horas por tema' },
              { icon: Users, label: 'Desempenho dos Alunos', desc: 'Análise qualitativa do rendimento' },
              { icon: AlertTriangle, label: 'Desafios Encontrados', desc: 'Dificuldades e obstáculos' },
              { icon: Lightbulb, label: 'Recomendações', desc: 'Sugestões para melhoria' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <item.icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Submit */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-medium">Pronto para gerar?</p>
              <p className="text-xs text-muted-foreground">
                {reportType === 'ANNUAL'
                  ? `A IA consolidará ${finalizedCount} relatório${finalizedCount !== 1 ? 's' : ''} trimestral${finalizedCount !== 1 ? 'is' : ''} num relatório anual completo.`
                  : 'A IA analisará aulas, planos e actividades do trimestre seleccionado.'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="border-border/60" asChild>
              <Link href={ROUTES.REPORTS}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Relatório {reportType === 'ANNUAL' ? 'Anual' : 'Trimestral'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
