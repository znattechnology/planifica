'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  Save,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Upload,
  FileUp,
  PenLine,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Textarea } from '@/src/ui/components/ui/textarea'
import { Select } from '@/src/ui/components/ui/select'
import { FormError, FormAlert } from '@/src/ui/components/ui/form-error'
import { planoAnualSchema, type PlanoAnualFormData } from '@/src/application/validators/dosificacao.validator'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'

type CreationMode = 'choose' | 'manual' | 'import'

interface UnidadeUI {
  id: string
  isOpen: boolean
}

const SUBJECTS = [
  'Matemática', 'Física', 'Química', 'Biologia', 'Língua Portuguesa',
  'Inglês', 'Francês', 'História', 'Geografia', 'Filosofia',
  'Educação Visual', 'Educação Física', 'Informática', 'Empreendedorismo',
]

const GRADES = [
  '7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe',
  '11ª Classe', '12ª Classe', '13ª Classe',
]

function toRoman(num: number): string {
  const numerals: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let result = ''
  for (const [value, symbol] of numerals) {
    while (num >= value) {
      result += symbol
      num -= value
    }
  }
  return result
}

// ─── Choice Screen ───────────────────────────────────────
function ChooseMode({ onSelect }: { onSelect: (mode: 'manual' | 'import') => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Como deseja criar o plano?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha a forma mais conveniente para si
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
        {/* Manual */}
        <button
          type="button"
          onClick={() => onSelect('manual')}
          className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-border/40 bg-card/50 p-8 text-center transition-all hover:border-accent/50 hover:bg-card/80 hover:shadow-md"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 transition-colors group-hover:bg-accent/20">
            <PenLine className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Criar Manualmente</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Preencha o formulário com as informações do plano de ensino da disciplina
            </p>
          </div>
          <span className="text-xs text-muted-foreground/60">Formulário completo MOD.20.DEM.00</span>
        </button>

        {/* Import */}
        <button
          type="button"
          onClick={() => onSelect('import')}
          className="group relative flex flex-col items-center gap-4 rounded-xl border-2 border-border/40 bg-card/50 p-8 text-center transition-all hover:border-accent/50 hover:bg-card/80 hover:shadow-md"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
            <FileUp className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Importar Documento</h3>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Carregue um plano existente em PDF, Word ou Excel e a IA extrai os dados automaticamente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">.pdf</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">.docx</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">.xlsx</span>
          </div>
        </button>
      </div>
    </div>
  )
}

// ─── Import Flow ─────────────────────────────────────────
type ImportStep = 'upload' | 'processing' | 'done' | 'error'

interface ImportedData {
  title: string
  subject: string
  grade: string
  academicYear: string
  regime?: string
  curso?: string
  horasSemanais?: number
  totalHoras?: number
  numAulas?: number
  fundamentacao?: string
  objectivosGerais?: string
  avaliacao?: string
  bibliografia?: string
  unidades: {
    nome: string
    topicos: {
      objectivosEspecificos: string
      conteudos: string
      numAulas: number
      metodos: string
      recursos: string
    }[]
  }[]
}

function ImportFlow({ onComplete, onCancel }: { onComplete: (data: ImportedData) => void; onCancel: () => void }) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const processFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx') && !name.endsWith('.xlsx')) {
      setError('Formato não suportado. Use PDF (.pdf), Word (.docx) ou Excel (.xlsx).')
      setStep('error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ficheiro demasiado grande. O limite é 10MB.')
      setStep('error')
      return
    }

    setFileName(file.name)
    setStep('processing')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(API_ROUTES.PLANO_ANUAL_IMPORT, {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error?.message || 'Erro ao processar o ficheiro')
      }

      setStep('done')
      onComplete(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar o ficheiro. Tente novamente.')
      setStep('error')
    }
  }, [onComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card/50 px-6 py-16 text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
            <Sparkles className="h-10 w-10 text-accent animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-card border-2 border-accent/30">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          </div>
        </div>
        <h3 className="mt-6 text-lg font-semibold">A analisar o documento...</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          A IA está a extrair as informações de <strong>{fileName}</strong>. Isto pode demorar alguns segundos.
        </p>
        <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Ficheiro recebido
          </div>
          <div className="h-px w-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            A extrair dados
          </div>
          <div className="h-px w-4 bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground/40">
            <FileText className="h-3.5 w-3.5" />
            Pré-visualizar
          </div>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Não foi possível processar</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Criar Manualmente
          </Button>
          <Button onClick={() => { setStep('upload'); setError('') }}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  // Upload step
  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-all ${
          isDragging
            ? 'border-accent bg-accent/5 scale-[1.01]'
            : 'border-border/60 bg-card/30 hover:border-accent/40 hover:bg-card/50'
        }`}
      >
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
          isDragging ? 'bg-accent/20' : 'bg-accent/10'
        }`}>
          <Upload className={`h-8 w-8 ${isDragging ? 'text-accent' : 'text-accent/70'}`} />
        </div>
        <h3 className="mt-4 text-base font-semibold">
          {isDragging ? 'Solte o ficheiro aqui' : 'Arraste o ficheiro ou clique para seleccionar'}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          PDF, Word (.docx) ou Excel (.xlsx) — até 10MB
        </p>
        <label className="mt-4 cursor-pointer">
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90">
            <FileUp className="h-4 w-4" />
            Seleccionar Ficheiro
          </span>
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-blue-500/5 border border-blue-500/20 px-4 py-3">
        <Sparkles className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Como funciona:</strong> A IA analisa o documento e extrai automaticamente
          disciplina, classe, objectivos, conteúdos, unidades e restantes campos.
          Depois poderá rever e editar antes de guardar.
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────
export default function NewPlanoAnualPage() {
  const router = useRouter()
  const [mode, setMode] = useState<CreationMode>('choose')
  const [serverError, setServerError] = useState('')
  const [, setImportedData] = useState<ImportedData | null>(null)
  const [showImportBanner, setShowImportBanner] = useState(false)

  const firstUnidadeId = crypto.randomUUID()
  const [unidadeUIState, setUnidadeUIState] = useState<UnidadeUI[]>([
    { id: firstUnidadeId, isOpen: true },
  ])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    getValues,
    reset,
  } = useForm<PlanoAnualFormData>({
    resolver: zodResolver(planoAnualSchema),
    defaultValues: {
      title: '',
      subject: '',
      grade: '',
      academicYear: '',
      regime: '',
      curso: '',
      horasSemanais: '',
      totalHoras: '',
      numAulas: '',
      fundamentacao: '',
      objectivosGerais: '',
      avaliacao: '',
      bibliografia: '',
      unidades: [
        {
          id: firstUnidadeId,
          nome: 'Unidade I',
          topicos: [
            { id: crypto.randomUUID(), objectivosEspecificos: '', conteudos: '', numAulas: '', metodos: '', recursos: '' },
            { id: crypto.randomUUID(), objectivosEspecificos: '', conteudos: '', numAulas: '', metodos: '', recursos: '' },
          ],
        },
      ],
    },
  })

  const unidades = watch('unidades')
  const horasSemanais = watch('horasSemanais')
  const totalHoras = watch('totalHoras')

  // ─── Import complete → populate form ───
  function handleImportComplete(data: ImportedData) {
    const uiStates: UnidadeUI[] = data.unidades.map(() => ({
      id: crypto.randomUUID(),
      isOpen: true,
    }))
    setUnidadeUIState(uiStates)

    const formUnidades = data.unidades.map((u, i) => ({
      id: uiStates[i].id,
      nome: u.nome,
      topicos: u.topicos.map((t) => ({
        id: crypto.randomUUID(),
        objectivosEspecificos: t.objectivosEspecificos || '',
        conteudos: t.conteudos || '',
        numAulas: String(t.numAulas || ''),
        metodos: t.metodos || '',
        recursos: t.recursos || '',
      })),
    }))

    // Ensure at least one topico per unidade
    for (const u of formUnidades) {
      if (u.topicos.length === 0) {
        u.topicos.push({ id: crypto.randomUUID(), objectivosEspecificos: '', conteudos: '', numAulas: '', metodos: '', recursos: '' })
      }
    }

    reset({
      title: data.title || '',
      subject: data.subject || '',
      grade: data.grade || '',
      academicYear: data.academicYear || '',
      regime: data.regime || '',
      curso: data.curso || '',
      horasSemanais: data.horasSemanais ? String(data.horasSemanais) : '',
      totalHoras: data.totalHoras ? String(data.totalHoras) : '',
      numAulas: data.numAulas ? String(data.numAulas) : '',
      fundamentacao: data.fundamentacao || '',
      objectivosGerais: data.objectivosGerais || '',
      avaliacao: data.avaliacao || '',
      bibliografia: data.bibliografia || '',
      unidades: formUnidades,
    })

    setImportedData(data)
    setShowImportBanner(true)
    setMode('manual')
  }

  // ─── Unidade management ───
  function addUnidade() {
    const id = crypto.randomUUID()
    const num = unidadeUIState.length + 1
    setUnidadeUIState([...unidadeUIState, { id, isOpen: true }])
    const current = getValues('unidades')
    setValue('unidades', [
      ...current,
      {
        id,
        nome: `Unidade ${toRoman(num)}`,
        topicos: [
          { id: crypto.randomUUID(), objectivosEspecificos: '', conteudos: '', numAulas: '', metodos: '', recursos: '' },
          { id: crypto.randomUUID(), objectivosEspecificos: '', conteudos: '', numAulas: '', metodos: '', recursos: '' },
        ],
      },
    ])
  }

  function removeUnidade(id: string) {
    if (unidadeUIState.length <= 1) return
    setUnidadeUIState(unidadeUIState.filter((u) => u.id !== id))
    const current = getValues('unidades')
    setValue('unidades', current.filter((u) => u.id !== id))
  }

  function toggleUnidade(id: string) {
    setUnidadeUIState(unidadeUIState.map((u) => (u.id === id ? { ...u, isOpen: !u.isOpen } : u)))
  }

  // ─── Topico management ───
  function addTopico(unidadeIndex: number) {
    const current = getValues('unidades')
    const updated = [...current]
    updated[unidadeIndex] = {
      ...updated[unidadeIndex],
      topicos: [
        ...updated[unidadeIndex].topicos,
        { id: crypto.randomUUID(), objectivosEspecificos: '', conteudos: '', numAulas: '', metodos: '', recursos: '' },
      ],
    }
    setValue('unidades', updated)
  }

  function removeTopico(unidadeIndex: number, topicoId: string) {
    const current = getValues('unidades')
    if (current[unidadeIndex].topicos.length <= 1) return
    const updated = [...current]
    updated[unidadeIndex] = {
      ...updated[unidadeIndex],
      topicos: updated[unidadeIndex].topicos.filter((t) => t.id !== topicoId),
    }
    setValue('unidades', updated)
  }

  // ─── Submit ───
  async function onSubmit(data: PlanoAnualFormData) {
    setServerError('')
    try {
      const payload = {
        title: data.title,
        subject: data.subject,
        grade: data.grade,
        academicYear: data.academicYear,
        content: {
          regime: data.regime,
          curso: data.curso,
          horasSemanais: Number(data.horasSemanais) || 0,
          totalHoras: Number(data.totalHoras) || 0,
          numAulas: Number(data.numAulas) || 0,
          fundamentacao: data.fundamentacao,
          objectivosGerais: data.objectivosGerais,
          avaliacao: data.avaliacao,
          bibliografia: data.bibliografia,
          unidades: data.unidades.map((u) => ({
            nome: u.nome,
            topicos: u.topicos.map((t) => ({
              objectivosEspecificos: t.objectivosEspecificos,
              conteudos: t.conteudos,
              numAulas: Number(t.numAulas) || 0,
              metodos: t.metodos,
              recursos: t.recursos,
            })),
          })),
        },
      }
      const res = await fetch(API_ROUTES.PLANO_ANUAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error?.message || 'Erro ao guardar plano anual')
      router.push(ROUTES.PLANO_ANUAL)
    } catch {
      setServerError('Não foi possível guardar o plano anual. Tente novamente.')
    }
  }

  const filledUnidades = (unidades || []).filter((u) => u.nome?.trim()).length
  const totalAulasCalculated = (unidades || []).reduce(
    (sum, u) => sum + u.topicos.reduce((s, t) => s + (Number(t.numAulas) || 0), 0),
    0,
  )

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href={ROUTES.PLANO_ANUAL}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos planos anuais
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {mode === 'choose' ? 'Novo Plano Anual' : 'Plano de Ensino da Disciplina'}
            </h1>
            {mode !== 'choose' && (
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                MOD.20.DEM.00
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'choose'
              ? 'Escolha como deseja criar o plano de ensino da disciplina.'
              : mode === 'import'
                ? 'Carregue o documento e a IA extrai os dados automaticamente.'
                : 'Preencha o plano anual da disciplina. A IA usará esta informação para gerar planos trimestrais e de aula.'}
          </p>
        </div>
        {mode !== 'choose' && (
          <Button variant="outline" size="sm" onClick={() => { setMode('choose'); setShowImportBanner(false) }}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Alterar método
          </Button>
        )}
      </div>

      {/* ─── Choose Mode ─── */}
      {mode === 'choose' && (
        <ChooseMode onSelect={(m) => setMode(m)} />
      )}

      {/* ─── Import Flow ─── */}
      {mode === 'import' && (
        <ImportFlow
          onComplete={handleImportComplete}
          onCancel={() => setMode('manual')}
        />
      )}

      {/* ─── Manual Form (also shown after import populates) ─── */}
      {mode === 'manual' && (
        <>
          {/* Import success banner */}
          {showImportBanner && (
            <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Dados importados com sucesso!
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Os campos foram preenchidos automaticamente. Reveja e corrija os dados antes de guardar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportBanner(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {serverError && <FormAlert message={serverError} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* === Informações Gerais === */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <BookOpen className="h-4 w-4 text-accent" />
                </div>
                <h2 className="text-base font-semibold">Informações Gerais</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Título do Plano</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Plano de Ensino - Matemática 10ª Classe"
                    aria-invalid={!!errors.title}
                    {...register('title')}
                  />
                  <FormError message={errors.title?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">
                    <GraduationCap className="mr-1.5 inline h-3.5 w-3.5" />
                    Disciplina
                  </Label>
                  <Select id="subject" aria-invalid={!!errors.subject} {...register('subject')}>
                    <option value="">Selecione a disciplina</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <FormError message={errors.subject?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">
                    <GraduationCap className="mr-1.5 inline h-3.5 w-3.5" />
                    Classe
                  </Label>
                  <Select id="grade" aria-invalid={!!errors.grade} {...register('grade')}>
                    <option value="">Selecione a classe</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </Select>
                  <FormError message={errors.grade?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicYear">
                    <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
                    Ano Lectivo
                  </Label>
                  <Input
                    id="academicYear"
                    placeholder="Ex: 2025/2026"
                    aria-invalid={!!errors.academicYear}
                    {...register('academicYear')}
                  />
                  <FormError message={errors.academicYear?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regime">Regime</Label>
                  <Select id="regime" {...register('regime')}>
                    <option value="">Selecione o regime</option>
                    <option value="Regular">Regular</option>
                    <option value="Pós-Laboral">Pós-Laboral</option>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="curso">Curso</Label>
                  <Input
                    id="curso"
                    placeholder="Ex: Ciências Físicas e Biológicas"
                    {...register('curso')}
                  />
                </div>
              </div>
            </section>

            {/* === Carga Horária === */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <h2 className="text-base font-semibold">Carga Horária</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="horasSemanais">Horas Semanais</Label>
                  <Input
                    id="horasSemanais"
                    type="number"
                    min="1"
                    max="40"
                    placeholder="Ex: 4"
                    aria-invalid={!!errors.horasSemanais}
                    {...register('horasSemanais')}
                  />
                  <FormError message={errors.horasSemanais?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalHoras">Total de Horas (anual/semestral)</Label>
                  <Input
                    id="totalHoras"
                    type="number"
                    min="0"
                    placeholder="Ex: 120"
                    {...register('totalHoras')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numAulas">Nº de Aulas (incl. avaliações)</Label>
                  <Input
                    id="numAulas"
                    type="number"
                    min="0"
                    placeholder="Ex: 60"
                    {...register('numAulas')}
                  />
                </div>
              </div>

              {(horasSemanais || totalHoras) && (
                <div className="mt-4 flex items-center gap-4 rounded-lg bg-accent/5 border border-accent/20 px-4 py-3">
                  <Clock className="h-4 w-4 text-accent shrink-0" />
                  <div className="flex flex-wrap gap-4 text-sm">
                    {horasSemanais && (
                      <span><strong className="text-accent">{horasSemanais}h</strong> semanais</span>
                    )}
                    {totalHoras && (
                      <span><strong className="text-accent">{totalHoras}h</strong> totais</span>
                    )}
                    {totalAulasCalculated > 0 && (
                      <span><strong className="text-accent">{totalAulasCalculated}</strong> aulas nas unidades</span>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* === Fundamentação e Objectivos === */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <FileText className="h-4 w-4 text-accent" />
                </div>
                <h2 className="text-base font-semibold">Fundamentação e Objectivos</h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundamentacao">Fundamentação ou justificativa da disciplina</Label>
                <Textarea
                  id="fundamentacao"
                  placeholder="Descreva a importância e justificativa da disciplina..."
                  rows={4}
                  {...register('fundamentacao')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectivosGerais">Objectivos gerais da disciplina</Label>
                <Textarea
                  id="objectivosGerais"
                  placeholder="Descreva os objectivos gerais que se pretende alcançar..."
                  rows={4}
                  {...register('objectivosGerais')}
                />
              </div>
            </section>

            {/* === Unidades / Conteúdos Programáticos === */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <BookOpen className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Conteúdos Programáticos</h2>
                    <p className="text-xs text-muted-foreground">
                      {filledUnidades} unidade{filledUnidades !== 1 ? 's' : ''}
                      {totalAulasCalculated > 0 && ` · ${totalAulasCalculated} aulas`}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addUnidade}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar Unidade
                </Button>
              </div>

              {errors.unidades?.message && <FormAlert message={errors.unidades.message} />}

              <div className="space-y-3">
                {unidadeUIState.map((uiState, unidadeIndex) => {
                  const unidadeErrors = errors.unidades?.[unidadeIndex]
                  const currentUnidade = unidades?.[unidadeIndex]
                  return (
                    <div key={uiState.id} className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                      {/* Unidade Header */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleUnidade(uiState.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleUnidade(uiState.id) } }}
                        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-card/80 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                            {toRoman(unidadeIndex + 1)}
                          </span>
                          <span className="text-sm font-medium">
                            {currentUnidade?.nome || `Unidade ${toRoman(unidadeIndex + 1)}`}
                          </span>
                          {currentUnidade?.topicos && (
                            <span className="text-xs text-muted-foreground">
                              ({currentUnidade.topicos.length} tópico{currentUnidade.topicos.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unidadeUIState.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); removeUnidade(uiState.id) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {uiState.isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Unidade Content */}
                      {uiState.isOpen && (
                        <div className="border-t border-border/30 px-5 py-4 space-y-4">
                          <div className="space-y-2">
                            <Label>Nome da Unidade</Label>
                            <Input
                              placeholder="Ex: Unidade I - Funções"
                              aria-invalid={!!unidadeErrors?.nome}
                              {...register(`unidades.${unidadeIndex}.nome`)}
                            />
                            <FormError message={unidadeErrors?.nome?.message} />
                          </div>

                          {/* Topicos Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-border/40">
                                  <th className="px-2 py-2 text-left font-medium text-muted-foreground w-1/5">Obj. Específicos</th>
                                  <th className="px-2 py-2 text-left font-medium text-muted-foreground w-1/5">Conteúdos</th>
                                  <th className="px-2 py-2 text-center font-medium text-muted-foreground w-16">Aulas</th>
                                  <th className="px-2 py-2 text-left font-medium text-muted-foreground w-1/5">Métodos</th>
                                  <th className="px-2 py-2 text-left font-medium text-muted-foreground w-1/5">Recursos</th>
                                  <th className="px-2 py-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentUnidade?.topicos.map((topico, topicoIndex) => (
                                  <tr key={topico.id} className="border-b border-border/20">
                                    <td className="px-1 py-1">
                                      <Textarea
                                        rows={2}
                                        className="min-h-[50px] text-xs"
                                        placeholder="Objectivos específicos..."
                                        {...register(`unidades.${unidadeIndex}.topicos.${topicoIndex}.objectivosEspecificos`)}
                                      />
                                    </td>
                                    <td className="px-1 py-1">
                                      <Textarea
                                        rows={2}
                                        className="min-h-[50px] text-xs"
                                        placeholder={`${unidadeIndex + 1}.${topicoIndex + 1}. `}
                                        {...register(`unidades.${unidadeIndex}.topicos.${topicoIndex}.conteudos`)}
                                      />
                                    </td>
                                    <td className="px-1 py-1">
                                      <Input
                                        type="number"
                                        min="0"
                                        className="w-14 text-center text-xs mx-auto"
                                        {...register(`unidades.${unidadeIndex}.topicos.${topicoIndex}.numAulas`)}
                                      />
                                    </td>
                                    <td className="px-1 py-1">
                                      <Textarea
                                        rows={2}
                                        className="min-h-[50px] text-xs"
                                        placeholder="Métodos..."
                                        {...register(`unidades.${unidadeIndex}.topicos.${topicoIndex}.metodos`)}
                                      />
                                    </td>
                                    <td className="px-1 py-1">
                                      <Textarea
                                        rows={2}
                                        className="min-h-[50px] text-xs"
                                        placeholder="Recursos..."
                                        {...register(`unidades.${unidadeIndex}.topicos.${topicoIndex}.recursos`)}
                                      />
                                    </td>
                                    <td className="px-1 py-1 text-center">
                                      {currentUnidade.topicos.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
                                          onClick={() => removeTopico(unidadeIndex, topico.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-accent hover:text-accent/80"
                            onClick={() => addTopico(unidadeIndex)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Adicionar Tópico
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-border/60 sm:hidden"
                onClick={addUnidade}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Unidade
              </Button>
            </section>

            {/* === Avaliação e Bibliografia === */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <FileText className="h-4 w-4 text-accent" />
                </div>
                <h2 className="text-base font-semibold">Avaliação e Bibliografia</h2>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avaliacao">Avaliação</Label>
                <Textarea
                  id="avaliacao"
                  placeholder="Descreva os critérios e métodos de avaliação..."
                  rows={4}
                  {...register('avaliacao')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bibliografia">Bibliografia</Label>
                <Textarea
                  id="bibliografia"
                  placeholder="Liste as referências bibliográficas..."
                  rows={4}
                  {...register('bibliografia')}
                />
              </div>
            </section>

            {/* === Submit === */}
            <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-medium">Pronto para guardar?</p>
                  <p className="text-xs text-muted-foreground">
                    Após guardar, poderá gerar planos trimestrais e de aula automaticamente com IA.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="border-border/60" asChild>
                  <Link href={ROUTES.PLANO_ANUAL}>Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Plano Anual
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
