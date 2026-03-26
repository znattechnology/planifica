'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  FileText,
  Award,
  Sparkles,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Textarea } from '@/src/ui/components/ui/textarea'
import { Select } from '@/src/ui/components/ui/select'
import { FormAlert } from '@/src/ui/components/ui/form-error'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'

const ACTIVITY_TYPES = [
  { value: 'LESSON_DELIVERED', label: 'Aula Leccionada', icon: BookOpen, description: 'Aula regular leccionada' },
  { value: 'ASSESSMENT_GIVEN', label: 'Avaliação', icon: FileText, description: 'Teste ou avaliação aplicada' },
  { value: 'EXTRA_ACTIVITY', label: 'Actividade Extra', icon: Award, description: 'Actividade extracurricular' },
  { value: 'REMEDIAL_CLASS', label: 'Aula de Reforço', icon: Sparkles, description: 'Aula de recuperação ou reforço' },
]

export default function NewActivityPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [type, setType] = useState('LESSON_DELIVERED')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState('45')
  const [studentCount, setStudentCount] = useState('')
  const [notes, setNotes] = useState('')
  const [outcomes, setOutcomes] = useState<string[]>([])
  const [challenges, setChallenges] = useState<string[]>([])
  const [newOutcome, setNewOutcome] = useState('')
  const [newChallenge, setNewChallenge] = useState('')

  function addOutcome() {
    if (newOutcome.trim()) {
      setOutcomes(prev => [...prev, newOutcome.trim()])
      setNewOutcome('')
    }
  }

  function addChallenge() {
    if (newChallenge.trim()) {
      setChallenges(prev => [...prev, newChallenge.trim()])
      setNewChallenge('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!subject || !grade || !topic || !description || !date || !duration) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(API_ROUTES.ACTIVITIES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject,
          grade,
          topic,
          description,
          date,
          duration: Number(duration),
          studentCount: studentCount ? Number(studentCount) : undefined,
          notes: notes || undefined,
          outcomes: outcomes.length > 0 ? outcomes : undefined,
          challenges: challenges.length > 0 ? challenges : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao registar actividade')
      router.push(ROUTES.ACTIVITIES)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.ACTIVITIES}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às actividades
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Registar Actividade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registe uma aula leccionada ou actividade realizada.
        </p>
      </div>

      {error && <FormAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Activity Type */}
        <div className="space-y-3">
          <Label>Tipo de Actividade</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTIVITY_TYPES.map(at => {
              const Icon = at.icon
              const isSelected = type === at.value
              return (
                <button
                  key={at.value}
                  type="button"
                  onClick={() => setType(at.value)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                      : 'border-border/40 bg-card/50 hover:border-accent/30'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-accent/20' : 'bg-secondary'}`}>
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{at.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{at.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main fields */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Disciplina *</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Matemática" />
            </div>
            <div className="space-y-2">
              <Label>Classe *</Label>
              <Select value={grade} onChange={e => setGrade(e.target.value)}>
                <option value="">Selecione...</option>
                {['7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe', '11ª Classe', '12ª Classe', '13ª Classe'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tema / Tópico *</Label>
            <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ex: Equações do 2º grau" />
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva brevemente o que foi realizado..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração (min) *</Label>
              <Input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nº de Alunos</Label>
              <Input type="number" min="0" value={studentCount} onChange={e => setStudentCount(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas / Observações</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
        </div>

        {/* Outcomes */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6 space-y-3">
          <Label>Resultados Alcançados</Label>
          <div className="flex gap-2">
            <Input
              value={newOutcome}
              onChange={e => setNewOutcome(e.target.value)}
              placeholder="Ex: Alunos compreenderam o conceito"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOutcome() } }}
            />
            <Button type="button" size="sm" variant="outline" onClick={addOutcome}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {outcomes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {outcomes.map((o, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2.5 py-1 text-xs text-green-600">
                  {o}
                  <button type="button" onClick={() => setOutcomes(prev => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Challenges */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6 space-y-3">
          <Label>Dificuldades Encontradas</Label>
          <div className="flex gap-2">
            <Input
              value={newChallenge}
              onChange={e => setNewChallenge(e.target.value)}
              placeholder="Ex: Falta de material didáctico"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChallenge() } }}
            />
            <Button type="button" size="sm" variant="outline" onClick={addChallenge}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {challenges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {challenges.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2.5 py-1 text-xs text-orange-600">
                  {c}
                  <button type="button" onClick={() => setChallenges(prev => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Registar Actividade
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
