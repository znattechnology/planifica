'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Calendar,
  Loader2,
  FileText,
  Sparkles,
  ArrowRight,
  Trash2,
  Clock,
  Target,
  Layers,
  Pencil,
  Download,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { exportPlanoAnualToPDF } from '@/src/shared/utils/plano-anual-export'
import { exportPlanoAnualToWord } from '@/src/shared/utils/plano-anual-word-export'
import { exportPlanoAnualToExcel } from '@/src/shared/utils/plano-anual-excel-export'

interface PlanoAnualDetail {
  id: string
  title: string
  subject: string
  grade: string
  academicYear: string
  content: {
    regime?: string
    curso?: string
    horasSemanais?: number
    totalHoras?: number
    numAulas?: number
    fundamentacao?: string
    objectivosGerais?: string
    avaliacao?: string
    bibliografia?: string
    unidades?: { nome: string; topicos: { objectivosEspecificos: string; conteudos: string; numAulas: number; metodos: string; recursos: string }[] }[]
    // Legacy
    themes?: { unit: string; title: string; objectives: string[]; weeks: number; contents: string[] }[]
    totalWeeks?: number
    hoursPerWeek?: number
  }
  teacher?: { name: string; school?: string }
  createdAt: string
  updatedAt: string
}

export default function PlanoAnualDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [plano, setPlano] = useState<PlanoAnualDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlano() {
      try {
        const res = await fetchWithAuth(`${API_ROUTES.PLANO_ANUAL}/${params.id}`)
        const data = await res.json()
        if (res.ok && data.data) {
          setPlano(data.data)
        } else {
          setError(data.error?.message || 'Plano anual não encontrado')
        }
      } catch {
        setError('Erro ao carregar plano anual')
      } finally {
        setIsLoading(false)
      }
    }
    if (params.id) fetchPlano()
  }, [params.id])

  async function handleDelete() {
    if (!plano) return
    try {
      const res = await fetchWithAuth(`${API_ROUTES.PLANO_ANUAL}?id=${plano.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push(ROUTES.PLANO_ANUAL)
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

  if (error || !plano) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">{error || 'Plano anual não encontrado'}</h2>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={ROUTES.PLANO_ANUAL}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos Planos Anuais
          </Link>
        </Button>
      </div>
    )
  }

  const { content } = plano
  const unidades = content.unidades || []
  const totalTopicos = unidades.reduce((sum, u) => sum + (u.topicos?.length || 0), 0)
  const totalAulas = unidades.reduce((sum, u) => sum + u.topicos.reduce((s, t) => s + (t.numAulas || 0), 0), 0)

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href={ROUTES.PLANO_ANUAL}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar aos Planos Anuais
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{plano.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{plano.subject}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="accent">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {plano.grade}
                </Badge>
                <Badge variant="secondary">
                  <Calendar className="mr-1 h-3 w-3" />
                  {plano.academicYear}
                </Badge>
                {content.regime && (
                  <Badge variant="secondary">{content.regime}</Badge>
                )}
                {content.curso && (
                  <Badge variant="secondary">{content.curso}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-border/60" asChild>
              <Link href={`/plano-anual/${plano.id}/template`}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Ver Modelo Oficial
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border/60"
              onClick={() => exportPlanoAnualToPDF(plano)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border/60"
              onClick={() => exportPlanoAnualToWord(plano)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Word
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border/60"
              onClick={() => exportPlanoAnualToExcel(plano)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              asChild
            >
              <Link href={ROUTES.PLANS_NEW}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Gerar Plano
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-border/60"
              asChild
            >
              <Link href={`/plano-anual/${plano.id}/edit`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Link>
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

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Unidades
          </div>
          <div className="mt-1 text-2xl font-bold">{unidades.length}</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Tópicos
          </div>
          <div className="mt-1 text-2xl font-bold">{totalTopicos}</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Horas/semana
          </div>
          <div className="mt-1 text-2xl font-bold">{content.horasSemanais || '—'}h</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Total Horas
          </div>
          <div className="mt-1 text-2xl font-bold">{content.totalHoras || '—'}h</div>
        </div>
      </div>

      {/* Fundamentação e Objectivos */}
      {(content.fundamentacao || content.objectivosGerais) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {content.fundamentacao && (
            <div className="rounded-xl border border-border/40 bg-card/50 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-semibold">Fundamentação</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.fundamentacao}</p>
            </div>
          )}
          {content.objectivosGerais && (
            <div className="rounded-xl border border-border/40 bg-card/50 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <Target className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-semibold">Objectivos Gerais</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.objectivosGerais}</p>
            </div>
          )}
        </div>
      )}

      {/* Unidades e Conteúdos */}
      <div>
        <h2 className="text-base font-semibold mb-4">Conteúdos Programáticos</h2>
        <div className="space-y-4">
          {unidades.map((unidade, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/40 bg-card/50 overflow-hidden"
            >
              {/* Unidade header */}
              <div className="flex items-center justify-between border-b border-border/30 bg-card/80 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold">{unidade.nome}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {unidade.topicos.length} tópico{unidade.topicos.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Topicos table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-card/60">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Obj. Específicos</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Conteúdos</th>
                      <th className="px-4 py-2 text-center font-medium text-muted-foreground text-xs">Aulas</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Métodos</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Recursos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unidade.topicos.map((topico, j) => (
                      <tr key={j} className="border-b border-border/20">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap">{topico.objectivosEspecificos || '—'}</td>
                        <td className="px-4 py-2.5 text-xs whitespace-pre-wrap">{topico.conteudos}</td>
                        <td className="px-4 py-2.5 text-xs text-center font-medium">{topico.numAulas || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap">{topico.metodos || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-pre-wrap">{topico.recursos || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avaliação e Bibliografia */}
      {(content.avaliacao || content.bibliografia) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {content.avaliacao && (
            <div className="rounded-xl border border-border/40 bg-card/50 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-semibold">Avaliação</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.avaliacao}</p>
            </div>
          )}
          {content.bibliografia && (
            <div className="rounded-xl border border-border/40 bg-card/50 p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <BookOpen className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-semibold">Bibliografia</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.bibliografia}</p>
            </div>
          )}
        </div>
      )}

      {/* Generate plans CTA */}
      <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold sm:text-base">
                Gerar planos a partir deste plano anual
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                A IA usará as unidades e conteúdos para criar planos trimestrais, quinzenais e de aula.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 sm:shrink-0"
            asChild
          >
            <Link href={ROUTES.PLANS_NEW}>
              Gerar Planos
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
