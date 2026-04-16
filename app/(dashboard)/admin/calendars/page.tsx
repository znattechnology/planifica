'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  School,
  Shield,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/src/ui/components/ui/badge'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'

interface CalendarTerm {
  trimester: number
  name: string
  startDate: string
  endDate: string
  teachingWeeks: number
}

interface CalendarData {
  id: string
  type: 'MINISTERIAL' | 'SCHOOL'
  academicYear: string
  schoolName?: string
  schoolId?: string
  country: string
  isActive: boolean
  version: number
  startDate: string
  endDate: string
  termsCount: number
  eventsCount: number
  terms: CalendarTerm[]
  createdAt: string
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  MINISTERIAL: { label: 'Ministerial', className: 'bg-purple-500/10 text-purple-500' },
  SCHOOL: { label: 'Escolar', className: 'bg-blue-500/10 text-blue-500' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminCalendarsPage() {
  const [calendars, setCalendars] = useState<CalendarData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [newAcademicYear, setNewAcademicYear] = useState('2025/2026')
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newType, setNewType] = useState<'MINISTERIAL' | 'SCHOOL'>('SCHOOL')

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.ADMIN_CALENDARS)
      const data = await res.json()
      if (res.ok && data.data) setCalendars(data.data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendars()
  }, [fetchCalendars])

  async function handleCreate() {
    setError(null)
    if (newType === 'SCHOOL' && !newSchoolName.trim()) {
      setError('Nome da escola é obrigatório para calendários escolares')
      return
    }

    setCreating(true)
    try {
      const res = await fetch(API_ROUTES.ADMIN_CALENDARS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: newAcademicYear,
          schoolName: newSchoolName.trim() || undefined,
          type: newType,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message || 'Erro ao criar calendário')
        return
      }
      setShowCreateForm(false)
      setNewSchoolName('')
      setNewType('SCHOOL')
      await fetchCalendars()
    } catch {
      setError('Erro de rede ao criar calendário')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(calendarId: string, currentActive: boolean) {
    setToggling(calendarId)
    try {
      const res = await fetch(API_ROUTES.ADMIN_CALENDARS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId, isActive: !currentActive }),
      })
      if (res.ok) {
        setCalendars(prev =>
          prev.map(c => (c.id === calendarId ? { ...c, isActive: !currentActive } : c)),
        )
      }
    } catch {
      // ignore
    } finally {
      setToggling(null)
    }
  }

  const filtered = calendars.filter(
    c =>
      (c.schoolName || '').toLowerCase().includes(search.toLowerCase()) ||
      c.academicYear.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase()),
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calendários Escolares</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {calendars.length} calendário{calendars.length !== 1 ? 's' : ''} no sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Novo Calendário
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-4">
          <h2 className="text-sm font-semibold">Criar Novo Calendário</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ano Lectivo</label>
              <Input
                value={newAcademicYear}
                onChange={e => setNewAcademicYear(e.target.value)}
                placeholder="2025/2026"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newType}
                onChange={e => setNewType(e.target.value as 'MINISTERIAL' | 'SCHOOL')}
              >
                <option value="SCHOOL">Escolar (Escola)</option>
                <option value="MINISTERIAL">Ministerial</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Nome da Escola {newType === 'SCHOOL' && <span className="text-destructive">*</span>}
              </label>
              <Input
                value={newSchoolName}
                onChange={e => setNewSchoolName(e.target.value)}
                placeholder="Ex: Escola Secundária do Kilamba"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating} size="sm">
              {creating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  A criar...
                </>
              ) : (
                'Criar Calendário'
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCreateForm(false)
                setError(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pesquisar por escola, ano lectivo, tipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold">Nenhum calendário encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie um calendário para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cal => {
            const typeCfg = TYPE_CONFIG[cal.type] || TYPE_CONFIG.SCHOOL
            const isExpanded = expandedId === cal.id

            return (
              <div
                key={cal.id}
                className="rounded-xl border border-border/40 bg-card/50 hover:border-accent/20 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      {cal.type === 'MINISTERIAL' ? (
                        <Shield className="h-4 w-4 text-accent" />
                      ) : (
                        <School className="h-4 w-4 text-accent" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`${ROUTES.ADMIN_CALENDARS}/${cal.id}`}
                          className="text-sm font-semibold hover:text-accent transition-colors"
                        >
                          {cal.type === 'MINISTERIAL'
                            ? `Calendário Ministerial ${cal.academicYear}`
                            : cal.schoolName || 'Escola sem nome'}
                        </Link>
                        <Badge className={`text-[10px] ${typeCfg.className}`}>
                          {typeCfg.label}
                        </Badge>
                        {cal.isActive ? (
                          <Badge className="text-[10px] bg-green-500/10 text-green-500">
                            <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-red-500/10 text-red-500">
                            <XCircle className="mr-1 h-2.5 w-2.5" />
                            Inactivo
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{cal.academicYear}</span>
                        <span>v{cal.version}</span>
                        <span>{cal.termsCount} trimestres</span>
                        <span>{cal.eventsCount} eventos</span>
                        <span>Criado {formatDate(cal.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`${ROUTES.ADMIN_CALENDARS}/${cal.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Gerir
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={toggling === cal.id}
                        onClick={() => handleToggleActive(cal.id, cal.isActive)}
                      >
                        {toggling === cal.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : cal.isActive ? (
                          'Desactivar'
                        ) : (
                          'Activar'
                        )}
                      </Button>
                      <button
                        className="p-1 text-muted-foreground hover:text-foreground"
                        onClick={() => setExpandedId(isExpanded ? null : cal.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && cal.terms.length > 0 && (
                  <div className="border-t border-border/30 px-4 pb-4 pt-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Trimestres</h4>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {cal.terms
                        .sort((a, b) => a.trimester - b.trimester)
                        .map(term => (
                          <div
                            key={term.trimester}
                            className="rounded-lg border border-border/30 p-3"
                          >
                            <div className="text-xs font-semibold">{term.name}</div>
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {formatDate(term.startDate)} — {formatDate(term.endDate)}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              {term.teachingWeeks} semanas lectivas
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
