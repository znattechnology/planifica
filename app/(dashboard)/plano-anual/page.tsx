'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  BookOpen,
  Search,
  MoreVertical,
  Calendar,
  GraduationCap,
  FileText,
  Trash2,
  Pencil,
  Eye,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

interface PlanoAnualItem {
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
    unidades?: { nome: string; topicos: unknown[] }[]
    // Legacy
    themes?: { title: string }[]
    totalWeeks?: number
    hoursPerWeek?: number
  }
  createdAt: string
}

export default function PlanoAnualPage() {
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [planos, setPlanos] = useState<PlanoAnualItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPlanos() {
      try {
        const res = await fetchWithAuth(API_ROUTES.PLANO_ANUAL)
        const data = await res.json()
        if (res.ok && data.data) {
          const items = Array.isArray(data.data) ? data.data : data.data?.data || []
          setPlanos(items)
        } else {
          console.error('[PlanoAnual] fetch failed:', res.status, data)
        }
      } catch (err) {
        console.error('[PlanoAnual] fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlanos()
  }, [])

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API_ROUTES.PLANO_ANUAL}?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlanos(prev => prev.filter(d => d.id !== id))
      }
    } catch {
      // ignore
    }
    setOpenMenu(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const isEmpty = planos.length === 0

  const filtered = planos.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.subject.toLowerCase().includes(search.toLowerCase()) ||
      p.grade.toLowerCase().includes(search.toLowerCase()),
  )

  function getUnidadesCount(p: PlanoAnualItem) {
    return p.content?.unidades?.length || p.content?.themes?.length || 0
  }

  function getTotalHoras(p: PlanoAnualItem) {
    return p.content?.totalHoras || (p.content?.totalWeeks && p.content?.hoursPerWeek
      ? p.content.totalWeeks * p.content.hoursPerWeek : 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Planos Anuais da Disciplina</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gira os planos de ensino anuais e gere planos trimestrais e de aula automaticamente.
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={ROUTES.PLANO_ANUAL_NEW}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Plano Anual
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar planos anuais..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <BookOpen className="h-8 w-8 text-accent" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhum plano anual encontrado</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Comece por criar o plano de ensino da disciplina. A IA usará os dados para gerar
            planos trimestrais e de aula automaticamente.
          </p>
          <Button className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href={ROUTES.PLANO_ANUAL_NEW}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Plano Anual
            </Link>
          </Button>
        </div>
      )}

      {/* List */}
      {!isEmpty && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plano) => (
            <div
              key={plano.id}
              className="group relative rounded-xl border border-border/40 bg-card/50 p-5 transition-all hover:border-accent/30 hover:bg-card/80"
            >
              {/* Menu */}
              <div className="absolute right-3 top-3">
                <button
                  onClick={() => setOpenMenu(openMenu === plano.id ? null : plano.id)}
                  className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {openMenu === plano.id && (
                  <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-border/40 bg-card p-1 shadow-lg">
                    <Link
                      href={`/plano-anual/${plano.id}`}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver detalhes
                    </Link>
                    <Link
                      href={`/plano-anual/${plano.id}/edit`}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(plano.id)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              {/* Icon & Title */}
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <BookOpen className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <h3 className="truncate text-sm font-semibold">{plano.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{plano.subject}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="accent">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {plano.grade}
                </Badge>
                <Badge variant="secondary">
                  <Calendar className="mr-1 h-3 w-3" />
                  {plano.academicYear}
                </Badge>
                {plano.content?.curso && (
                  <Badge variant="secondary" className="text-xs">
                    {plano.content.curso}
                  </Badge>
                )}
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 border-t border-border/30 pt-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Unidades</div>
                  <div className="text-sm font-semibold">{getUnidadesCount(plano)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Horas</div>
                  <div className="text-sm font-semibold">{getTotalHoras(plano) || '—'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Aulas</div>
                  <div className="text-sm font-semibold">{plano.content?.numAulas || '—'}</div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 border-border/60 text-xs" asChild>
                  <Link href={`/plano-anual/${plano.id}`}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Ver Detalhes
                  </Link>
                </Button>
                <Button size="sm" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 text-xs">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Gerar Plano
                </Button>
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
            Nenhum resultado para &ldquo;{search}&rdquo;
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
                Gere planos automaticamente
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Insira o plano anual da disciplina e a IA criará planos trimestrais, quinzenais e de aula.
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 sm:shrink-0" asChild>
            <Link href={ROUTES.PLANO_ANUAL_NEW}>
              Novo Plano Anual
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
