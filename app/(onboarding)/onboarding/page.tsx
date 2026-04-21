'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  School,
  BookOpen,
  Palette,
  Rocket,
  Brain,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Plus,
  X,
  CalendarDays,
  BarChart3,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Select } from '@/src/ui/components/ui/select'
import { FormAlert } from '@/src/ui/components/ui/form-error'
import { API_ROUTES, ROUTES } from '@/src/shared/constants/routes.constants'
import { useAuth } from '@/src/ui/providers/auth-provider'
import { getCurrentAcademicYear, getAcademicYearOptions } from '@/src/shared/utils/academic-year'

// ─── Constants ───────────────────────────────────────────

const ANGOLAN_CLASSES = [
  '1.ª classe', '2.ª classe', '3.ª classe', '4.ª classe', '5.ª classe', '6.ª classe',
  '7.ª classe', '8.ª classe', '9.ª classe', '10.ª classe', '11.ª classe', '12.ª classe', '13.ª classe',
]

const COMMON_SUBJECTS = [
  'Matemática', 'Língua Portuguesa', 'Física', 'Química', 'Biologia',
  'Geografia', 'História', 'Educação Moral e Cívica', 'Educação Física',
  'Inglês', 'Francês', 'Filosofia', 'Informática', 'Educação Visual',
  'Educação Musical', 'Ciências da Natureza', 'Empreendedorismo',
]

const TEACHING_STYLES = [
  { value: 'traditional', label: 'Tradicional', description: 'Aulas expositivas com foco na teoria e exercícios estruturados' },
  { value: 'interactive', label: 'Interactivo', description: 'Discussões em grupo, trabalhos práticos e participação activa' },
  { value: 'project-based', label: 'Baseado em projectos', description: 'Aprendizagem através de projectos reais e resolução de problemas' },
  { value: 'mixed', label: 'Misto', description: 'Combinação flexível de métodos conforme o conteúdo e os alunos' },
]

const INTELLIGENCE_FEATURES = [
  {
    icon: CalendarDays,
    title: 'Planeamento com base no calendário real',
    description: 'A IA respeita feriados, períodos de exames e o calendário escolar do seu país. Nunca mais planear aulas para dias sem escola.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Brain,
    title: 'Aprende com as suas aulas',
    description: 'Quando marca uma aula como dada, parcial ou não dada, a IA lembra-se. O próximo plano será mais realista.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e análise automática',
    description: 'Veja o progresso real do trimestre, identifique atrasos e receba sugestões para recuperar conteúdos.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: RefreshCw,
    title: 'Ajustes quando algo muda',
    description: 'Alunos não acompanharam? Ficou sem aulas por causa de chuvas? A IA redistribui os conteúdos automaticamente.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
]


// ─── Steps ───────────────────────────────────────────────

const STEPS = [
  { icon: Sparkles, title: 'Início' },
  { icon: School, title: 'Escola' },
  { icon: BookOpen, title: 'Disciplinas' },
  { icon: Palette, title: 'Estilo' },
  { icon: Brain, title: 'A IA' },
  { icon: CalendarDays, title: 'Calendário' },
  { icon: Rocket, title: 'Começar' },
]

// ─── Animation Variants ─────────────────────────────────

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
}

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ─── Types ───────────────────────────────────────────────

interface CalendarOption {
  id: string
  name: string
  type: 'MINISTERIAL' | 'SCHOOL'
  schoolName?: string
  isRecommended?: boolean
  reason?: string
}

interface OnboardingData {
  schoolName: string
  country: string
  academicYear: string
  subjects: string[]
  classes: string[]
  numberOfClasses: number
  teachingStyle: string
  selectedCalendarId?: string
}

// ─── Component ───────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [customSubject, setCustomSubject] = useState('')

  const [calendarOptions, setCalendarOptions] = useState<CalendarOption[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const calendarFetchKey = useRef('')

  const [data, setData] = useState<OnboardingData>({
    schoolName: '',
    country: 'Angola',
    academicYear: getCurrentAcademicYear(),
    subjects: [],
    classes: [],
    numberOfClasses: 1,
    teachingStyle: 'mixed',
  })

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  function toggleArrayItem(field: 'subjects' | 'classes', item: string) {
    setData(prev => {
      const current = prev[field]
      const updated = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item]
      return { ...prev, [field]: updated }
    })
  }

  function addCustomSubject() {
    const trimmed = customSubject.trim()
    if (trimmed && !data.subjects.includes(trimmed)) {
      updateData({ subjects: [...data.subjects, trimmed] })
      setCustomSubject('')
    }
  }

  function canAdvance(): boolean {
    switch (currentStep) {
      case 0: return true // Welcome
      case 1: return data.schoolName.trim().length >= 2 && data.academicYear.length >= 4
      case 2: return data.subjects.length > 0 && data.classes.length > 0 && data.numberOfClasses >= 1
      case 3: return data.teachingStyle !== ''
      case 4: return true // Intelligence explainer
      case 5: return true // Calendar selection (always valid — falls back to ministerial)
      case 6: return true // Get started
      default: return false
    }
  }

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
      setError('')
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
      setError('')
    }
  }

  async function handleComplete(goToPlan: boolean) {
    setError('')
    setIsSubmitting(true)
    try {
      const res = await fetch(API_ROUTES.AUTH_ONBOARDING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error?.message || 'Erro ao guardar dados')
      }

      await refreshUser()

      if (goToPlan) {
        router.push(ROUTES.DOSIFICACAO_NEW)
      } else {
        router.push(ROUTES.DASHBOARD)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const firstName = user?.name?.split(' ')[0] || ''

  // ─── Welcome Step (Step 0) ─────────────────────────────

  function renderWelcome() {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center py-4"
      >
        {/* Hero icon */}
        <motion.div variants={staggerItem} className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
            <Brain className="h-10 w-10 text-accent" />
          </div>
          <motion.div
            className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
          >
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </motion.div>
        </motion.div>

        <motion.h1 variants={staggerItem} className="text-2xl font-bold tracking-tight sm:text-3xl">
          {firstName ? `${firstName}, bem-vindo ao Planifica` : 'Bem-vindo ao Planifica'}
        </motion.h1>

        <motion.p variants={staggerItem} className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          O sistema que planeia as suas aulas por si — com base no seu calendário, conteúdos e desempenho real.
        </motion.p>

        <motion.div variants={staggerItem} className="mt-8 flex flex-col items-center gap-3">
          <Button
            onClick={handleNext}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-5 text-base"
          >
            Começar
            <ArrowRight className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Leva menos de 2 minutos</span>
        </motion.div>

        {/* Trust indicators */}
        <motion.div variants={staggerItem} className="mt-10 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" />
            Grátis para professores
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" />
            Calendário angolano integrado
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-green-500" />
            IA que aprende consigo
          </span>
        </motion.div>
      </motion.div>
    )
  }

  // ─── School Step (Step 1) ──────────────────────────────

  function renderSchool() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Onde lecciona?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Precisamos disto para personalizar o calendário e os planos ao seu contexto.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">Nome da escola *</Label>
            <Input
              id="schoolName"
              placeholder="Ex: Escola Secundária nº 1042 de Luanda"
              value={data.schoolName}
              onChange={e => updateData({ schoolName: e.target.value })}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Select
              id="country"
              value={data.country}
              onChange={e => updateData({ country: e.target.value })}
            >
              <option value="Angola">Angola</option>
              <option value="Moçambique">Moçambique</option>
              <option value="Portugal">Portugal</option>
              <option value="Brasil">Brasil</option>
              <option value="Cabo Verde">Cabo Verde</option>
              <option value="São Tomé e Príncipe">São Tomé e Príncipe</option>
              <option value="Guiné-Bissau">Guiné-Bissau</option>
              <option value="Timor-Leste">Timor-Leste</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="academicYear">Ano lectivo *</Label>
            <Select
              id="academicYear"
              value={data.academicYear}
              onChange={e => updateData({ academicYear: e.target.value })}
            >
              {getAcademicYearOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>
    )
  }

  // ─── Subjects Step (Step 2) ────────────────────────────

  function renderSubjects() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">O que lecciona?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Seleccione as suas disciplinas e classes. A IA vai gerar planos específicos para cada combinação.
          </p>
        </div>

        {/* Subjects */}
        <div className="space-y-3">
          <Label>Disciplinas *</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_SUBJECTS.map(subject => (
              <button
                key={subject}
                type="button"
                onClick={() => toggleArrayItem('subjects', subject)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                  data.subjects.includes(subject)
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground'
                }`}
              >
                {data.subjects.includes(subject) && <Check className="mr-1 inline h-3 w-3" />}
                {subject}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Outra disciplina..."
              value={customSubject}
              onChange={e => setCustomSubject(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSubject())}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addCustomSubject}
              disabled={!customSubject.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {data.subjects.filter(s => !COMMON_SUBJECTS.includes(s)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.subjects.filter(s => !COMMON_SUBJECTS.includes(s)).map(subject => (
                <span
                  key={subject}
                  className="inline-flex items-center gap-1 rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => toggleArrayItem('subjects', subject)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-accent/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Classes */}
        <div className="space-y-3">
          <Label>Classes *</Label>
          <div className="flex flex-wrap gap-2">
            {ANGOLAN_CLASSES.map(cls => (
              <button
                key={cls}
                type="button"
                onClick={() => toggleArrayItem('classes', cls)}
                className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                  data.classes.includes(cls)
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground'
                }`}
              >
                {data.classes.includes(cls) && <Check className="mr-1 inline h-3 w-3" />}
                {cls}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="numberOfClasses">Número de turmas</Label>
          <Input
            id="numberOfClasses"
            type="number"
            min={1}
            max={50}
            value={data.numberOfClasses}
            onChange={e => updateData({ numberOfClasses: parseInt(e.target.value) || 1 })}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Quantas turmas lecciona no total?
          </p>
        </div>
      </div>
    )
  }

  // ─── Teaching Style Step (Step 3) ──────────────────────

  function renderTeachingStyle() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Como é o seu estilo de ensino?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A IA vai adaptar a metodologia dos planos ao seu estilo. Pode alterar a qualquer momento.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEACHING_STYLES.map(style => (
            <button
              key={style.value}
              type="button"
              onClick={() => updateData({ teachingStyle: style.value })}
              className={`rounded-xl border p-4 text-left transition-all ${
                data.teachingStyle === style.value
                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                  : 'border-border bg-card hover:border-accent/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  data.teachingStyle === style.value
                    ? 'border-accent bg-accent'
                    : 'border-border'
                }`}>
                  {data.teachingStyle === style.value && (
                    <Check className="h-3 w-3 text-accent-foreground" />
                  )}
                </div>
                <span className="font-medium">{style.label}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {style.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Intelligence Explainer Step (Step 4) ──────────────

  function renderIntelligence() {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={staggerItem}>
          <h2 className="text-lg font-semibold">O que faz o Planifica diferente?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Não é só um gerador de planos. É um assistente que aprende consigo e se adapta à realidade da sua sala.
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {INTELLIGENCE_FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={i}
                variants={staggerItem}
                className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-accent/30"
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${feature.bg}`}>
                  <Icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>

      </motion.div>
    )
  }

  // ─── Calendar Selection Step (Step 5) ──────────────────

  // Fetch calendars when entering step 5, or when school/year changes
  useEffect(() => {
    if (currentStep !== 5) return

    const key = `${data.academicYear}|${data.schoolName}`
    if (calendarFetchKey.current === key) return
    calendarFetchKey.current = key

    let cancelled = false

    async function load() {
      setLoadingCalendars(true)
      try {
        const params = new URLSearchParams({ available: 'true', year: data.academicYear })
        if (data.schoolName.trim()) {
          params.set('school', data.schoolName.trim())
        }
        const res = await fetch(`${API_ROUTES.CALENDAR}?${params.toString()}`)
        if (!res.ok || cancelled) return

        const json = await res.json()
        if (cancelled) return

        const opts: CalendarOption[] = []

        // Read the pre-ordered options array from backend
        if (Array.isArray(json.data?.options)) {
          for (const opt of json.data.options) {
            const cal = opt.calendar
            if (!cal?.id) continue
            opts.push({
              id: cal.id,
              name: cal.type === 'MINISTERIAL'
                ? 'Ministério da Educação (Padrão Nacional)'
                : cal.schoolName || 'Calendário da Escola',
              type: cal.type,
              schoolName: cal.schoolName,
              isRecommended: opt.isRecommended,
              reason: opt.reason,
            })
          }
        }

        // Fallback: read ministerial/schoolCalendars directly
        if (opts.length === 0) {
          if (json.data?.ministerial?.id) {
            opts.push({
              id: json.data.ministerial.id,
              name: 'Ministério da Educação (Padrão Nacional)',
              type: 'MINISTERIAL',
              isRecommended: true,
            })
          }
          if (Array.isArray(json.data?.schoolCalendars)) {
            for (const sc of json.data.schoolCalendars) {
              if (!sc?.id) continue
              opts.push({
                id: sc.id,
                name: sc.schoolName || 'Calendário da Escola',
                type: 'SCHOOL',
                schoolName: sc.schoolName,
                isRecommended: false,
              })
            }
          }
        }

        if (cancelled) return
        setCalendarOptions(opts)

        // Auto-select recommended
        if (opts.length > 0) {
          const rec = opts.find(o => o.isRecommended) || opts[0]
          updateData({ selectedCalendarId: rec.id })
        }
      } catch {
        if (!cancelled) calendarFetchKey.current = '' // allow retry
      } finally {
        if (!cancelled) setLoadingCalendars(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [currentStep, data.academicYear, data.schoolName, updateData])

  function renderCalendarSelection() {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={staggerItem}>
          <h2 className="text-lg font-semibold">Escolha o calendário escolar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O calendário define feriados, períodos de exames e semanas lectivas. A IA usa-o para gerar planos realistas.
          </p>
        </motion.div>

        {loadingCalendars ? (
          <motion.div variants={staggerItem} className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            A carregar calendários disponíveis...
          </motion.div>
        ) : calendarOptions.length === 0 ? (
          <motion.div variants={staggerItem} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-yellow-500 mb-3" />
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
              Nenhum calendário disponível para {data.academicYear}
            </p>
            <p className="text-xs text-muted-foreground">
              O administrador do sistema ainda não criou um calendário para este ano letivo.
              Poderá selecionar um calendário mais tarde nas definições.
            </p>
          </motion.div>
        ) : (
          <motion.div variants={staggerItem} className="space-y-3">
            {calendarOptions.map((cal) => {
              const isSelected = data.selectedCalendarId === cal.id
              const isMinisterial = cal.type === 'MINISTERIAL'
              return (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => updateData({ selectedCalendarId: cal.id })}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/5'
                      : 'border-border/60 bg-card hover:border-accent/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isMinisterial ? 'bg-blue-500/10' : 'bg-amber-500/10'
                    }`}>
                      <span className="text-lg">{isMinisterial ? '\u{1F4D8}' : '\u{1F3EB}'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">
                          {isMinisterial ? 'Calendário Ministerial' : cal.name}
                        </h3>
                        {cal.isRecommended && (
                          <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
                            Recomendado
                          </span>
                        )}
                        {isMinisterial && !cal.isRecommended && (
                          <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cal.reason || (isMinisterial
                          ? `Calendário oficial do Ministério da Educação de ${data.country}`
                          : `Calendário específico de ${cal.schoolName || 'escola'}`
                        )}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 shrink-0 text-accent" />
                    )}
                  </div>
                </button>
              )
            })}
          </motion.div>
        )}

      </motion.div>
    )
  }

  // ─── Get Started Step (Step 6) ─────────────────────────

  function renderGetStarted() {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={staggerItem}>
          <h2 className="text-lg font-semibold">Tudo pronto, {firstName || 'professor'}!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O seu perfil está configurado. A IA já sabe quem é, o que lecciona e como ensina.
          </p>
        </motion.div>

        {/* Summary */}
        <motion.div variants={staggerItem} className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-2.5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo</h3>
          <div className="grid gap-1.5 text-sm">
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Escola</span>
              <span className="font-medium text-right max-w-[220px] truncate">{data.schoolName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Ano lectivo</span>
              <span className="font-medium">{data.academicYear}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Disciplinas</span>
              <span className="font-medium text-right max-w-[220px]">{data.subjects.join(', ')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground">Classes</span>
              <span className="font-medium">{data.classes.join(', ')}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Estilo</span>
              <span className="font-medium">
                {TEACHING_STYLES.find(s => s.value === data.teachingStyle)?.label || data.teachingStyle}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Wow moment: What will happen next */}
        <motion.div variants={staggerItem} className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">O que acontece a seguir?</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Ao inserir o seu plano anual da disciplina, a IA gera automaticamente a dosificação trimestral com base no calendário real de {data.country}. Verá imediatamente:
              </p>
              <ul className="mt-2 space-y-1">
                <li className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>Distribuição equilibrada de conteúdos por semana</span>
                </li>
                <li className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>Sem conflitos com feriados e pausas lectivas</span>
                </li>
                <li className="flex items-center gap-2 text-xs">
                  <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>Análise de qualidade e coerência do plano</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={staggerItem} className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleComplete(true)}
            disabled={isSubmitting}
            className="group relative rounded-xl border-2 border-accent bg-accent/5 p-5 text-left transition-all hover:bg-accent/10 overflow-hidden"
          >
            <div className="relative z-10">
              <Rocket className="mb-2 h-6 w-6 text-accent" />
              <h3 className="font-semibold">Criar plano anual agora</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Insira os conteúdos e a IA gera a dosificação trimestral em minutos.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleComplete(false)}
            disabled={isSubmitting}
            className="group rounded-xl border border-border p-5 text-left transition-all hover:border-accent/50 hover:bg-card"
          >
            <BookOpen className="mb-2 h-6 w-6 text-muted-foreground" />
            <h3 className="font-semibold">Explorar o dashboard</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Conheça a plataforma primeiro. Pode criar planos quando quiser.
            </p>
          </button>
        </motion.div>

        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            A preparar tudo para si...
          </motion.div>
        )}
      </motion.div>
    )
  }

  // ─── Render ────────────────────────────────────────────

  const isWelcome = currentStep === 0
  const isFinal = currentStep === 6
  const showProgressBar = !isWelcome
  const showNavigation = !isWelcome && !isFinal

  return (
    <div className="space-y-8">
      {/* Header (hidden on welcome) */}
      {showProgressBar && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Configurar o seu perfil
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Passo {currentStep} de {STEPS.length - 1}
            </p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1.5">
            {STEPS.slice(1).map((_, index) => {
              const stepIndex = index + 1
              const isActive = stepIndex === currentStep
              const isCompleted = stepIndex < currentStep
              return (
                <div key={index} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${
                    isCompleted
                      ? 'bg-accent'
                      : isActive
                        ? 'bg-accent/50'
                        : 'bg-border'
                  }`} />
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Step Content with Animation */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {isWelcome ? (
            renderWelcome()
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8">
              {error && <FormAlert message={error} />}
              {currentStep === 1 && renderSchool()}
              {currentStep === 2 && renderSubjects()}
              {currentStep === 3 && renderTeachingStyle()}
              {currentStep === 4 && renderIntelligence()}
              {currentStep === 5 && renderCalendarSelection()}
              {currentStep === 6 && renderGetStarted()}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {showNavigation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Seguinte
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {isFinal && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar e editar
          </Button>
        </div>
      )}
    </div>
  )
}
