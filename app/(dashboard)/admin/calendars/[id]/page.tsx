'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  Flag,
  PartyPopper,
  BookOpen,
  ClipboardCheck,
  RefreshCw,
  GraduationCap,
  Shield,
  School,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Textarea } from '@/src/ui/components/ui/textarea'
import { Select } from '@/src/ui/components/ui/select'
import { Badge } from '@/src/ui/components/ui/badge'
import { FormAlert } from '@/src/ui/components/ui/form-error'
import { ROUTES } from '@/src/shared/constants/routes.constants'

// ─── Types ───────────────────────────────────────────────

interface CalendarTerm {
  id: string
  name: string
  trimester: number
  startDate: string
  endDate: string
  teachingWeeks: number
}

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  type: string
  allDay: boolean
}

interface SchoolCalendar {
  id: string
  academicYear: string
  country: string
  schoolName?: string
  type: 'MINISTERIAL' | 'SCHOOL'
  isActive: boolean
  version: number
  startDate: string
  endDate: string
  terms: CalendarTerm[]
  events: CalendarEvent[]
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Flag }> = {
  NATIONAL_HOLIDAY: { label: 'Feriado Nacional', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: Flag },
  SCHOOL_HOLIDAY: { label: 'Feriado Escolar', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: PartyPopper },
  TRIMESTER_BREAK: { label: 'Férias', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: PartyPopper },
  EXAM_PERIOD: { label: 'Provas', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: ClipboardCheck },
  MAKEUP_EXAM: { label: 'Exame de Recurso', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: RefreshCw },
  PEDAGOGICAL_ACTIVITY: { label: 'Jornada Pedagógica', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: BookOpen },
  SCHOOL_EVENT: { label: 'Evento Escolar', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: GraduationCap },
  CUSTOM: { label: 'Personalizado', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: CalendarDays },
}

const TERM_COLORS = [
  'bg-accent/8 border-accent/20',
  'bg-blue-500/8 border-blue-500/20',
  'bg-purple-500/8 border-purple-500/20',
]

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ─── Helpers ─────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getUTCDate()} ${MONTHS_PT[d.getUTCMonth()].slice(0, 3)}`
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getUTCDate()} de ${MONTHS_PT[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}

function getMonthRange(calendar: SchoolCalendar): { year: number; month: number }[] {
  const start = new Date(calendar.startDate)
  const end = new Date(calendar.endDate)
  const months: { year: number; month: number }[] = []
  let y = start.getUTCFullYear()
  let m = start.getUTCMonth() > 0 ? start.getUTCMonth() - 1 : start.getUTCMonth()
  while (y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth() + 1)) {
    months.push({ year: y, month: m })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return months
}

function getTermForDate(date: Date, terms: CalendarTerm[]): CalendarTerm | undefined {
  return terms.find(t => {
    const start = new Date(t.startDate)
    const end = new Date(t.endDate)
    return date >= start && date <= end
  })
}

function getEventsForDate(date: Date, events: CalendarEvent[]): CalendarEvent[] {
  return events.filter(e => {
    const start = new Date(e.startDate)
    const end = new Date(e.endDate)
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    return d >= new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
        && d <= new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return day === 0 ? 6 : day - 1
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

// ─── View Tabs ───────────────────────────────────────────

type ViewTab = 'calendar' | 'events'

// ─── Component ───────────────────────────────────────────

export default function AdminCalendarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [calendar, setCalendar] = useState<SchoolCalendar | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [filterType, setFilterType] = useState<string>('ALL')

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/calendars/${id}`)
      const data = await res.json()
      if (res.ok && data.data?.calendar) {
        setCalendar(data.data.calendar)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  async function handleAddEvent(eventData: {
    title: string
    description: string
    startDate: string
    endDate: string
    type: string
  }) {
    setError('')
    try {
      const res = await fetch(`/api/admin/calendars/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao adicionar evento')
      await fetchCalendar()
      setShowAddEvent(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    }
  }

  async function handleRemoveEvent(eventId: string) {
    try {
      await fetch(`/api/admin/calendars/${id}/events?eventId=${eventId}`, {
        method: 'DELETE',
      })
      await fetchCalendar()
      setSelectedEvent(null)
      setEditingEvent(null)
    } catch {
      // ignore
    }
  }

  async function handleEditEvent(eventId: string, eventData: {
    title: string
    description: string
    startDate: string
    endDate: string
    type: string
  }) {
    setError('')
    try {
      // Delete old, create new (no PATCH for events)
      await fetch(`/api/admin/calendars/${id}/events?eventId=${eventId}`, {
        method: 'DELETE',
      })
      const res = await fetch(`/api/admin/calendars/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao guardar evento')
      await fetchCalendar()
      setEditingEvent(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (!calendar) {
    return (
      <div className="space-y-6">
        <Link
          href={ROUTES.ADMIN_CALENDARS}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos calendários
        </Link>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Calendário não encontrado</h2>
        </div>
      </div>
    )
  }

  const months = getMonthRange(calendar)
  const today = new Date()
  const currentTerm = getTermForDate(today, calendar.terms)

  const filteredEvents = filterType === 'ALL'
    ? calendar.events
    : calendar.events.filter(e => e.type === filterType)

  // Group events by type for stats
  const eventsByType: Record<string, number> = {}
  calendar.events.forEach(e => {
    eventsByType[e.type] = (eventsByType[e.type] || 0) + 1
  })

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={ROUTES.ADMIN_CALENDARS}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos calendários
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            {calendar.type === 'MINISTERIAL' ? (
              <Shield className="h-6 w-6 text-accent" />
            ) : (
              <School className="h-6 w-6 text-accent" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {calendar.type === 'MINISTERIAL'
                ? `Calendário Ministerial`
                : calendar.schoolName || 'Calendário Escolar'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge className={calendar.type === 'MINISTERIAL' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}>
                {calendar.type === 'MINISTERIAL' ? 'Ministerial' : 'Escolar'}
              </Badge>
              {calendar.isActive ? (
                <Badge className="bg-green-500/10 text-green-500">
                  <CheckCircle2 className="mr-1 h-2.5 w-2.5" />Activo
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-500">
                  <XCircle className="mr-1 h-2.5 w-2.5" />Inactivo
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {calendar.academicYear} &middot; v{calendar.version} &middot; {calendar.events.length} eventos
              </span>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowAddEvent(true)} size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar Evento
        </Button>
      </div>

      {error && <FormAlert message={error} />}

      {/* View Tabs */}
      <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
        {[
          { id: 'calendar' as ViewTab, label: 'Calendário Mensal' },
          { id: 'events' as ViewTab, label: `Eventos (${calendar.events.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ CALENDAR VIEW ═══ */}
      {activeTab === 'calendar' && (
        <>
          {/* Trimester Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            {calendar.terms
              .sort((a, b) => a.trimester - b.trimester)
              .map((term, i) => {
                const termEvents = calendar.events.filter(e => {
                  const eStart = new Date(e.startDate)
                  return eStart >= new Date(term.startDate) && eStart <= new Date(term.endDate)
                })
                const examCount = termEvents.filter(e => e.type === 'EXAM_PERIOD' || e.type === 'MAKEUP_EXAM').length
                const holidayCount = termEvents.filter(e => e.type === 'NATIONAL_HOLIDAY').length
                const isCurrent = currentTerm?.id === term.id

                return (
                  <div key={term.id} className={`rounded-xl border p-4 ${TERM_COLORS[i]} ${isCurrent ? 'ring-2 ring-accent/30' : ''}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{term.name}</h3>
                      {isCurrent && <Badge variant="accent" className="text-[10px]">Actual</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(term.startDate)} — {formatDate(term.endDate)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">{term.teachingWeeks} semanas</Badge>
                      {examCount > 0 && <Badge variant="secondary" className="text-xs">{examCount} avaliações</Badge>}
                      {holidayCount > 0 && <Badge variant="secondary" className="text-xs">{holidayCount} feriados</Badge>}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Calendar Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {months.map(({ year, month }) => {
              const daysInMonth = getDaysInMonth(year, month)
              const firstDay = getFirstDayOfWeek(year, month)

              return (
                <div key={`${year}-${month}`} className="rounded-xl border border-border/40 bg-card/50 p-4">
                  <h3 className="mb-3 text-center font-semibold">
                    {MONTHS_PT[month]} {year}
                  </h3>

                  <div className="mb-1 grid grid-cols-7 gap-px text-center">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                      <div key={d} className="py-1 text-[10px] font-medium text-muted-foreground">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px">
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-8" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const date = new Date(Date.UTC(year, month, day))
                      const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
                      const term = getTermForDate(date, calendar.terms)
                      const dayEvents = getEventsForDate(date, calendar.events)
                      const hasHoliday = dayEvents.some(e => e.type === 'NATIONAL_HOLIDAY' || e.type === 'SCHOOL_HOLIDAY')
                      const hasBreak = dayEvents.some(e => e.type === 'TRIMESTER_BREAK')
                      const hasExam = dayEvents.some(e => e.type === 'EXAM_PERIOD' || e.type === 'MAKEUP_EXAM')
                      const hasPedagogical = dayEvents.some(e => e.type === 'PEDAGOGICAL_ACTIVITY')
                      const hasEvent = dayEvents.some(e => e.type === 'SCHOOL_EVENT' || e.type === 'CUSTOM')
                      const isTodayDate = isToday(year, month, day)

                      let bgClass = ''
                      if (hasHoliday) bgClass = 'bg-red-500/15 text-red-600'
                      else if (hasBreak) bgClass = 'bg-blue-500/15 text-blue-600'
                      else if (hasExam) bgClass = 'bg-purple-500/15 text-purple-600'
                      else if (hasPedagogical) bgClass = 'bg-cyan-500/15 text-cyan-600'
                      else if (hasEvent) bgClass = 'bg-emerald-500/15 text-emerald-600'
                      else if (isWeekend) bgClass = 'text-muted-foreground/40'
                      else if (term) bgClass = 'text-foreground'
                      else bgClass = 'text-muted-foreground/30'

                      return (
                        <button
                          key={day}
                          onClick={() => { if (dayEvents.length > 0) setSelectedEvent(dayEvents[0]) }}
                          className={`relative flex h-8 items-center justify-center rounded text-xs font-medium transition-colors hover:ring-1 hover:ring-accent/50 ${bgClass} ${
                            isTodayDate ? 'ring-2 ring-accent font-bold' : ''
                          }`}
                          title={dayEvents.map(e => e.title).join(', ') || undefined}
                        >
                          {day}
                          {dayEvents.length > 0 && (
                            <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-px">
                              <span className="h-1 w-1 rounded-full bg-current" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <h3 className="mb-3 text-sm font-semibold">Legenda</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => {
                const Icon = config.icon
                const count = eventsByType[key] || 0
                return (
                  <div key={key} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                    {count > 0 && <span className="font-semibold">({count})</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══ EVENTS VIEW ═══ */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {/* Filter by type */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                filterType === 'ALL'
                  ? 'bg-accent/10 text-accent border-accent/20'
                  : 'text-muted-foreground border-border/40 hover:border-accent/20'
              }`}
            >
              Todos ({calendar.events.length})
            </button>
            {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => {
              const count = eventsByType[key] || 0
              if (count === 0) return null
              return (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    filterType === key
                      ? config.color
                      : 'text-muted-foreground border-border/40 hover:border-accent/20'
                  }`}
                >
                  {config.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Events list */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-4 sm:p-6">
            <div className="space-y-2">
              {filteredEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum evento nesta categoria.</p>
              ) : (
                filteredEvents.map(event => {
                  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.CUSTOM
                  const Icon = config.icon
                  const isPast = new Date(event.endDate) < today
                  return (
                    <div
                      key={event.id}
                      className={`group flex items-center gap-3 rounded-lg border border-border/30 p-3 transition-colors hover:bg-card ${isPast ? 'opacity-50' : ''}`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateFull(event.startDate)}
                          {event.startDate !== event.endDate && ` — ${formatDateFull(event.endDate)}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">
                        {config.label}
                      </Badge>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={() => setEditingEvent(event)}
                          className="text-muted-foreground hover:text-accent"
                          title="Editar evento"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveEvent(event.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remover evento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-semibold">{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {selectedEvent.description && (
              <p className="mt-2 text-sm text-muted-foreground">{selectedEvent.description}</p>
            )}
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Início:</span> {formatDateFull(selectedEvent.startDate)}</p>
              <p><span className="text-muted-foreground">Fim:</span> {formatDateFull(selectedEvent.endDate)}</p>
              <p>
                <span className="text-muted-foreground">Tipo:</span>{' '}
                <Badge variant="secondary" className="text-xs">
                  {EVENT_TYPE_CONFIG[selectedEvent.type]?.label || selectedEvent.type}
                </Badge>
              </p>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setEditingEvent(selectedEvent); setSelectedEvent(null) }}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveEvent(selectedEvent.id)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventFormModal
          title="Editar Evento"
          initialData={{
            title: editingEvent.title,
            description: editingEvent.description || '',
            startDate: editingEvent.startDate.split('T')[0],
            endDate: editingEvent.endDate.split('T')[0],
            type: editingEvent.type,
          }}
          onClose={() => setEditingEvent(null)}
          onSave={(data) => handleEditEvent(editingEvent.id, data)}
          onDelete={() => handleRemoveEvent(editingEvent.id)}
        />
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <EventFormModal
          title="Adicionar Evento"
          initialData={{
            title: '',
            description: '',
            startDate: '',
            endDate: '',
            type: 'CUSTOM',
          }}
          onClose={() => setShowAddEvent(false)}
          onSave={handleAddEvent}
        />
      )}
    </div>
  )
}

// ─── Event Form Modal ────────────────────────────────────

function EventFormModal({
  title,
  initialData,
  onClose,
  onSave,
  onDelete,
}: {
  title: string
  initialData: { title: string; description: string; startDate: string; endDate: string; type: string }
  onClose: () => void
  onSave: (data: { title: string; description: string; startDate: string; endDate: string; type: string }) => Promise<void>
  onDelete?: () => void
}) {
  const [form, setForm] = useState(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.title || !form.startDate || !form.endDate) return
    setIsSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <FormAlert message={error} />}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Reunião de pais"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição opcional"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data início *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data fim *</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
            >
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </Select>
          </div>

          <div className="flex justify-between">
            <div>
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                  disabled={isSaving}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Eliminar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={!form.title || !form.startDate || !form.endDate || isSaving}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...</> : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
