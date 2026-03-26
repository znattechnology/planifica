'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Loader2,
  GraduationCap,
  FileText,
  CheckCircle2,
  Shield,
  Search,
} from 'lucide-react'
import { Badge } from '@/src/ui/components/ui/badge'
import { Input } from '@/src/ui/components/ui/input'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'

interface TeacherData {
  id: string
  name: string
  email: string
  role: string
  school?: string
  subject?: string
  createdAt: string
  plans: { total: number; approved: number; generated: number }
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  TEACHER: { label: 'Professor', className: 'bg-accent/10 text-accent' },
  COORDINATOR: { label: 'Coordenador', className: 'bg-blue-500/10 text-blue-500' },
  ADMIN: { label: 'Admin', className: 'bg-purple-500/10 text-purple-500' },
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const res = await fetch(API_ROUTES.ADMIN_TEACHERS)
        const data = await res.json()
        if (res.ok && data.data) setTeachers(data.data)
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchTeachers()
  }, [])

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.school || '').toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Professores</h1>
          <p className="mt-1 text-sm text-muted-foreground">{teachers.length} utilizadores registados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Pesquisar por nome, email, disciplina..."
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
          <Users className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-semibold">Nenhum utilizador encontrado</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(teacher => {
            const roleCfg = ROLE_LABELS[teacher.role] || ROLE_LABELS.TEACHER
            return (
              <div
                key={teacher.id}
                className="rounded-xl border border-border/40 bg-card/50 p-4 hover:border-accent/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <span className="text-sm font-bold text-accent">
                      {teacher.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{teacher.name}</h3>
                      <Badge className={`text-[10px] ${roleCfg.className}`}>
                        <Shield className="mr-1 h-2.5 w-2.5" />
                        {roleCfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{teacher.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {teacher.subject && (
                        <Badge variant="secondary" className="text-[10px]">
                          <GraduationCap className="mr-1 h-2.5 w-2.5" />
                          {teacher.subject}
                        </Badge>
                      )}
                      {teacher.school && (
                        <Badge variant="secondary" className="text-[10px]">{teacher.school}</Badge>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {teacher.plans.total} planos
                      </div>
                      {teacher.plans.approved > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          {teacher.plans.approved} aprovados
                        </div>
                      )}
                      {teacher.plans.generated > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-accent">
                          {teacher.plans.generated} para revisão
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    Desde {new Date(teacher.createdAt).toLocaleDateString('pt-AO')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
