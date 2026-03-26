'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  GraduationCap,
  Flag,
  PartyPopper,
  BookOpen,
  ClipboardCheck,
  RefreshCw,
  X,
  Pencil,
  Activity,
  FileText,
  Clock,
  Target,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Textarea } from '@/src/ui/components/ui/textarea'
import { Select } from '@/src/ui/components/ui/select'
import { Badge } from '@/src/ui/components/ui/badge'
import { FormAlert } from '@/src/ui/components/ui/form-error'
import { API_ROUTES, ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { useAuth } from '@/src/ui/providers/auth-provider'

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
  startDate: string
  endDate: string
  terms: CalendarTerm[]
  events: CalendarEvent[]
}

interface PlanData {
  id: string
  title: string
  type: string
  subject: string
  grade: string
  status: string
  createdAt: string
}

interface ActivityData {
  id: string
  type: string
  subject: string
  grade: string
  topic: string
  date: string
  duration: number
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

const WEEKDAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

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

function getWeekDates(refDate: Date): Date[] {
  const d = new Date(refDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + i)
    return dt
  })
}

function getActivitiesForDate(date: Date, activities: ActivityData[]): ActivityData[] {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return activities.filter(a => a.date.startsWith(dateStr))
}

function computeAcademicYear(offset: number): string {
  const now = new Date()
  const baseYear = now.getMonth() < 1 ? now.getFullYear() - 1 : now.getFullYear()
  const year = baseYear + offset
  return `${year}/${year + 1}`
}

// ─── Component ───────────────────────────────────────────

type ViewTab = 'calendar' | 'week' | 'events'

export default function CalendarPage() {
  const { user } = useAuth()
  const [calendar, setCalendar] = useState<SchoolCalendar | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [yearOffset, setYearOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar')

  // Plans & Activities integration
  const [plans, setPlans] = useState<PlanData[]>([])
  const [activities, setActivities] = useState<ActivityData[]>([])

  // Add event form
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    type: 'CUSTOM',
  })

  const academicYear = computeAcademicYear(yearOffset)

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchWithAuth(`${API_ROUTES.CALENDAR}?year=${encodeURIComponent(academicYear)}`)
      const data = await res.json()
      if (res.ok && data.data?.calendar) {
        setCalendar(data.data.calendar)
      } else {
        setCalendar(null)
      }
    } catch {
      setCalendar(null)
    } finally {
      setIsLoading(false)
    }
  }, [academicYear])

  // Fetch plans & activities
  const fetchIntegrations = useCallback(async () => {
    try {
      const [plansRes, activitiesRes] = await Promise.all([
        fetchWithAuth(API_ROUTES.PLANS),
        fetchWithAuth(API_ROUTES.ACTIVITIES),
      ])
      const [plansData, activitiesData] = await Promise.all([
        plansRes.json(),
        activitiesRes.json(),
      ])
      if (plansRes.ok && plansData.data) {
        const items = Array.isArray(plansData.data) ? plansData.data : plansData.data.data || []
        setPlans(items)
      }
      if (activitiesRes.ok && activitiesData.data) setActivities(activitiesData.data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchCalendar()
    fetchIntegrations()
  }, [fetchCalendar, fetchIntegrations])

  async function handleCreateCalendar() {
    setError('')
    setIsCreating(true)
    try {
      const res = await fetchWithAuth(API_ROUTES.CALENDAR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYear, schoolName: user?.school }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao criar calendário')
      setCalendar(data.data.calendar)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleAddEvent() {
    if (!newEvent.title || !newEvent.startDate || !newEvent.endDate) return
    setError('')
    try {
      const res = await fetchWithAuth(API_ROUTES.CALENDAR_EVENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, academicYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao adicionar evento')
      await fetchCalendar()
      setShowAddEvent(false)
      setNewEvent({ title: '', description: '', startDate: '', endDate: '', type: 'CUSTOM' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    }
  }

  async function handleRemoveEvent(eventId: string) {
    try {
      await fetchWithAuth(`${API_ROUTES.CALENDAR_EVENTS}?id=${eventId}&year=${encodeURIComponent(academicYear)}`, {
        method: 'DELETE',
      })
      await fetchCalendar()
      setSelectedEvent(null)
      setEditingEvent(null)
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

  // No calendar yet
  if (!calendar) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calendário Escolar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure o calendário do ano lectivo para planificação inteligente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setYearOffset(prev => prev - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[90px] text-center">{academicYear}</span>
            <Button variant="ghost" size="sm" onClick={() => setYearOffset(prev => prev + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && <FormAlert message={error} />}

        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-card/30 p-12 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">Nenhum calendário configurado</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Gere automaticamente o calendário escolar angolano para {academicYear} com todos os feriados, férias e períodos de avaliação.
          </p>
          <Button
            onClick={handleCreateCalendar}
            disabled={isCreating}
            className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isCreating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar calendário...</>
            ) : (
              <><CalendarDays className="mr-2 h-4 w-4" />Gerar Calendário {academicYear}</>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Calendar exists
  const months = getMonthRange(calendar)
  const today = new Date()
  const weekDates = getWeekDates(today)
  const currentTerm = getTermForDate(today, calendar.terms)

  // Stats
  const totalTeachingWeeks = calendar.terms.reduce((sum, t) => sum + t.teachingWeeks, 0)
  const recentPlans = plans.filter(p => p.status === 'GENERATED' || p.status === 'APPROVED').slice(0, 5)
  const recentActivities = activities.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Calendário Escolar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {calendar.schoolName || 'Angola'} — {totalTeachingWeeks} semanas lectivas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setYearOffset(prev => prev - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold min-w-[90px] text-center">{calendar.academicYear}</span>
          <Button variant="ghost" size="sm" onClick={() => setYearOffset(prev => prev + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={() => setShowAddEvent(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Evento
          </Button>
        </div>
      </div>

      {error && <FormAlert message={error} />}

      {/* View Tabs */}
      <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
        {[
          { id: 'calendar' as ViewTab, label: 'Calendário' },
          { id: 'week' as ViewTab, label: 'Semana Actual' },
          { id: 'events' as ViewTab, label: 'Eventos' },
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

      {/* Current Term Banner */}
      {currentTerm && activeTab !== 'events' && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20">
            <Target className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Estamos no {currentTerm.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(currentTerm.startDate)} — {formatDate(currentTerm.endDate)} · {currentTerm.teachingWeeks} semanas lectivas
            </p>
          </div>
          <Badge variant="accent" className="hidden sm:inline-flex">{today.getDate()} {MONTHS_PT[today.getMonth()]}</Badge>
        </div>
      )}

      {/* ═══ CALENDAR VIEW ═══ */}
      {activeTab === 'calendar' && (
        <>
          {/* Trimester Summary Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            {calendar.terms.map((term, i) => {
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
                      const dayActivities = getActivitiesForDate(date, activities)
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
                          {(dayEvents.length > 0 || dayActivities.length > 0) && (
                            <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-px">
                              {dayEvents.length > 0 && <span className="h-1 w-1 rounded-full bg-current" />}
                              {dayActivities.length > 0 && <span className="h-1 w-1 rounded-full bg-accent" />}
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
                return (
                  <div key={key} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </div>
                )
              })}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs text-accent">
                <Activity className="h-3 w-3" />
                Aula leccionada
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ WEEK VIEW ═══ */}
      {activeTab === 'week' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="border-b border-border/30 bg-card/80 px-5 py-3">
              <h3 className="text-sm font-semibold">
                Semana de {weekDates[0].getDate()} a {weekDates[6].getDate()} de {MONTHS_PT[weekDates[0].getMonth()]} {weekDates[0].getFullYear()}
              </h3>
            </div>

            <div className="divide-y divide-border/30">
              {weekDates.map((date, i) => {
                const dayEvents = getEventsForDate(date, calendar.events)
                const dayActivities = getActivitiesForDate(date, activities)
                const isTodayDate = isToday(date.getFullYear(), date.getMonth(), date.getDate())
                const isWeekend = i >= 5

                return (
                  <div
                    key={i}
                    className={`px-5 py-3 ${isTodayDate ? 'bg-accent/5' : ''} ${isWeekend ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        isTodayDate ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isTodayDate ? 'text-accent' : ''}`}>
                          {WEEKDAYS_PT[date.getDay()]}
                          {isTodayDate && <span className="ml-2 text-xs text-accent">(Hoje)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {MONTHS_PT[date.getMonth()]} {date.getFullYear()}
                        </p>
                      </div>
                    </div>

                    {/* Events for this day */}
                    {dayEvents.length > 0 && (
                      <div className="ml-12 space-y-1 mb-1">
                        {dayEvents.map(ev => {
                          const cfg = EVENT_TYPE_CONFIG[ev.type] || EVENT_TYPE_CONFIG.CUSTOM
                          const Icon = cfg.icon
                          return (
                            <div key={ev.id} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs mr-2 ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {ev.title}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Activities for this day */}
                    {dayActivities.length > 0 && (
                      <div className="ml-12 space-y-1">
                        {dayActivities.map(act => (
                          <div key={act.id} className="flex items-center gap-2 text-xs">
                            <Activity className="h-3 w-3 text-accent" />
                            <span className="font-medium">{act.topic}</span>
                            <Badge variant="secondary" className="text-[10px]">{act.subject}</Badge>
                            <span className="text-muted-foreground">{act.duration} min</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {dayEvents.length === 0 && dayActivities.length === 0 && !isWeekend && (
                      <p className="ml-12 text-xs text-muted-foreground">Sem eventos</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Recent Plans */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Planos Recentes
                </h3>
                <Link href={ROUTES.PLANS} className="text-xs text-accent hover:underline">Ver todos</Link>
              </div>
              {recentPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum plano gerado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {recentPlans.map(plan => (
                    <Link key={plan.id} href={`/plans/${plan.id}`} className="flex items-center gap-2 rounded-lg p-2 text-xs hover:bg-secondary transition-colors">
                      <Badge variant="secondary" className="text-[10px]">{plan.type}</Badge>
                      <span className="truncate font-medium">{plan.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activities */}
            <div className="rounded-xl border border-border/40 bg-card/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  Actividades Recentes
                </h3>
                <Link href={ROUTES.ACTIVITIES} className="text-xs text-accent hover:underline">Ver todas</Link>
              </div>
              {recentActivities.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma actividade registada.</p>
              ) : (
                <div className="space-y-2">
                  {recentActivities.map(act => (
                    <div key={act.id} className="flex items-center gap-2 rounded-lg p-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{act.topic}</span>
                      <Badge variant="secondary" className="text-[10px]">{act.subject}</Badge>
                      <span className="text-muted-foreground">{new Date(act.date).toLocaleDateString('pt-AO')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ EVENTS VIEW ═══ */}
      {activeTab === 'events' && (
        <div className="rounded-xl border border-border/40 bg-card/50 p-4 sm:p-6">
          <h3 className="mb-4 text-sm font-semibold">Todos os Eventos ({calendar.events.length})</h3>
          <div className="space-y-2">
            {calendar.events.map(event => {
              const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.CUSTOM
              const Icon = config.icon
              const isCustom = event.type === 'CUSTOM' || event.type === 'SCHOOL_EVENT'
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
                  {isCustom && (
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
                  )}
                </div>
              )
            })}
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
            {(selectedEvent.type === 'CUSTOM' || selectedEvent.type === 'SCHOOL_EVENT') && (
              <div className="mt-4 flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setEditingEvent(selectedEvent); setSelectedEvent(null) }}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />Editar
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveEvent(selectedEvent.id)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />Eliminar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          academicYear={academicYear}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { setEditingEvent(null); fetchCalendar() }}
        />
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddEvent(false)}>
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Adicionar Evento</h3>
              <button onClick={() => setShowAddEvent(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={newEvent.title}
                  onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Reunião de pais"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data início *</Label>
                  <Input
                    type="date"
                    value={newEvent.startDate}
                    onChange={e => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data fim *</Label>
                  <Input
                    type="date"
                    value={newEvent.endDate}
                    onChange={e => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newEvent.type}
                  onChange={e => setNewEvent(prev => ({ ...prev, type: e.target.value }))}
                >
                  {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddEvent(false)}>Cancelar</Button>
                <Button
                  onClick={handleAddEvent}
                  disabled={!newEvent.title || !newEvent.startDate || !newEvent.endDate}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Edit Event Modal Component ─────────────────────────

function EditEventModal({
  event,
  academicYear,
  onClose,
  onSaved,
}: {
  event: CalendarEvent
  academicYear: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    title: event.title,
    description: event.description || '',
    startDate: event.startDate.split('T')[0],
    endDate: event.endDate.split('T')[0],
    type: event.type,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.title || !form.startDate || !form.endDate) return
    setIsSaving(true)
    setError('')
    try {
      // Delete old event and create new one (API doesn't have PATCH for events)
      await fetchWithAuth(`${API_ROUTES.CALENDAR_EVENTS}?id=${event.id}&year=${encodeURIComponent(academicYear)}`, {
        method: 'DELETE',
      })
      const res = await fetchWithAuth(API_ROUTES.CALENDAR_EVENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, academicYear }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao guardar evento')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Editar Evento</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <FormAlert message={error} />}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data início *</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data fim *</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2">
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
  )
}
