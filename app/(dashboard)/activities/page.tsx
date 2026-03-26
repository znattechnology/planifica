'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  Loader2,
  ClipboardCheck,
  Calendar,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  Trash2,
  FileText,
  Award,
  Sparkles,
  Activity,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

interface ActivityData {
  id: string
  type: string
  subject: string
  grade: string
  topic: string
  description: string
  date: string
  duration: number
  studentCount?: number
  notes?: string
  outcomes?: string[]
  challenges?: string[]
  createdAt: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof ClipboardCheck; className: string }> = {
  LESSON_DELIVERED: { label: 'Aula Leccionada', icon: BookOpen, className: 'bg-accent/10 text-accent' },
  ASSESSMENT_GIVEN: { label: 'Avaliação', icon: FileText, className: 'bg-blue-500/10 text-blue-500' },
  EXTRA_ACTIVITY: { label: 'Actividade Extra', icon: Award, className: 'bg-purple-500/10 text-purple-500' },
  REMEDIAL_CLASS: { label: 'Aula de Reforço', icon: Sparkles, className: 'bg-orange-500/10 text-orange-500' },
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetchWithAuth(API_ROUTES.ACTIVITIES)
        const data = await res.json()
        if (res.ok && data.data) {
          setActivities(data.data)
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchActivities()
  }, [])

  async function handleDelete(id: string) {
    try {
      const res = await fetchWithAuth(`${API_ROUTES.ACTIVITIES}/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setActivities(prev => prev.filter(a => a.id !== id))
      }
    } catch {
      // ignore
    }
  }

  const filtered = filter === 'ALL' ? activities : activities.filter(a => a.type === filter)

  // Stats
  const totalHours = Math.round(activities.reduce((sum, a) => sum + a.duration, 0) / 60)
  const totalLessons = activities.filter(a => a.type === 'LESSON_DELIVERED').length
  const subjects = [...new Set(activities.map(a => a.subject))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Actividades de Ensino</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registe as aulas leccionadas e actividades realizadas.
          </p>
        </div>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={ROUTES.ACTIVITIES_NEW}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Actividade
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="text-xs">Total Actividades</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{activities.length}</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs">Aulas Leccionadas</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{totalLessons}</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Horas Totais</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{totalHours}h</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span className="text-xs">Disciplinas</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{subjects.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'ALL', label: 'Todas' },
          { value: 'LESSON_DELIVERED', label: 'Aulas' },
          { value: 'ASSESSMENT_GIVEN', label: 'Avaliações' },
          { value: 'EXTRA_ACTIVITY', label: 'Extra' },
          { value: 'REMEDIAL_CLASS', label: 'Reforço' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-16 text-center">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold">Nenhuma actividade registada</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Comece a registar as suas aulas e actividades para acompanhar o seu progresso.
          </p>
          <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href={ROUTES.ACTIVITIES_NEW}>
              <Plus className="mr-2 h-4 w-4" />
              Registar Actividade
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(activity => {
            const typeCfg = TYPE_CONFIG[activity.type] || TYPE_CONFIG.LESSON_DELIVERED
            const TypeIcon = typeCfg.icon
            return (
              <div
                key={activity.id}
                className="rounded-xl border border-border/40 bg-card/50 p-4 hover:border-accent/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${typeCfg.className}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">{activity.topic}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={typeCfg.className}>
                        <TypeIcon className="mr-1 h-3 w-3" />
                        {typeCfg.label}
                      </Badge>
                      <Badge variant="secondary">{activity.subject}</Badge>
                      <Badge variant="secondary">{activity.grade}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(activity.date).toLocaleDateString('pt-AO')}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {activity.duration} min
                      </div>
                      {activity.studentCount && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {activity.studentCount} alunos
                        </div>
                      )}
                    </div>
                    {activity.outcomes && activity.outcomes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {activity.outcomes.slice(0, 3).map((o, i) => (
                          <span key={i} className="rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] text-green-600">
                            {o}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
