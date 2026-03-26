'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Textarea } from '@/src/ui/components/ui/textarea'
import { Select } from '@/src/ui/components/ui/select'
import { FormError, FormAlert } from '@/src/ui/components/ui/form-error'
import { planoAnualSchema, type PlanoAnualFormData } from '@/src/application/validators/dosificacao.validator'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

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
  '7ª Classe', '8ª Classe', '9ª Classe',
  '10ª Classe', '11ª Classe', '12ª Classe', '13ª Classe',
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

export default function EditPlanoAnualPage() {
  const params = useParams()
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [unidadeUIState, setUnidadeUIState] = useState<UnidadeUI[]>([])

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
      unidades: [],
    },
  })

  // Load existing data
  useEffect(() => {
    async function fetchPlano() {
      try {
        const res = await fetchWithAuth(`${API_ROUTES.PLANO_ANUAL}/${params.id}`)
        const data = await res.json()
        if (res.ok && data.data) {
          const p = data.data
          const formUnidades = (p.content?.unidades || []).map((u: { nome: string; topicos: { objectivosEspecificos?: string; conteudos?: string; numAulas?: number; metodos?: string; recursos?: string }[] }) => ({
            id: crypto.randomUUID(),
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

          reset({
            title: p.title || '',
            subject: p.subject || '',
            grade: p.grade || '',
            academicYear: p.academicYear || '',
            regime: p.content?.regime || '',
            curso: p.content?.curso || '',
            horasSemanais: String(p.content?.horasSemanais || ''),
            totalHoras: String(p.content?.totalHoras || ''),
            numAulas: String(p.content?.numAulas || ''),
            fundamentacao: p.content?.fundamentacao || '',
            objectivosGerais: p.content?.objectivosGerais || '',
            avaliacao: p.content?.avaliacao || '',
            bibliografia: p.content?.bibliografia || '',
            unidades: formUnidades.length > 0 ? formUnidades : [{
              id: crypto.randomUUID(),
              nome: 'Unidade I',
              topicos: [{ id: crypto.randomUUID(), objectivosEspecificos: '', conteudos: '', numAulas: '', metodos: '', recursos: '' }],
            }],
          })

          setUnidadeUIState(
            formUnidades.length > 0
              ? formUnidades.map((u: { id: string }) => ({ id: u.id, isOpen: false }))
              : [{ id: crypto.randomUUID(), isOpen: true }]
          )
        } else {
          setServerError(data.error?.message || 'Plano anual não encontrado')
        }
      } catch {
        setServerError('Erro ao carregar plano anual')
      } finally {
        setIsLoadingData(false)
      }
    }
    if (params.id) fetchPlano()
  }, [params.id, reset])

  const unidades = watch('unidades')
  const horasSemanais = watch('horasSemanais')
  const totalHoras = watch('totalHoras')

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
        id: params.id,
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
      const res = await fetchWithAuth(API_ROUTES.PLANO_ANUAL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error?.message || 'Erro ao actualizar plano anual')
      router.push(`/plano-anual/${params.id}`)
    } catch {
      setServerError('Não foi possível actualizar o plano anual. Tente novamente.')
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  const filledUnidades = (unidades || []).filter((u) => u.nome?.trim()).length
  const totalAulasCalculated = (unidades || []).reduce(
    (sum, u) => sum + u.topicos.reduce((s, t) => s + (Number(t.numAulas) || 0), 0),
    0,
  )

  return (
    <div className="space-y-6">
      <Link
        href={`/plano-anual/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos detalhes
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Editar Plano de Ensino
            </h1>
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              MOD.20.DEM.00
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Actualize os dados do plano anual da disciplina.
          </p>
        </div>
      </div>

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
                  {totalAulasCalculated > 0 && ` \u00b7 ${totalAulasCalculated} aulas`}
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
              <p className="text-sm font-medium">Guardar alterações?</p>
              <p className="text-xs text-muted-foreground">
                As alterações serão aplicadas imediatamente ao plano anual.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="border-border/60" asChild>
              <Link href={`/plano-anual/${params.id}`}>Cancelar</Link>
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
                  Guardar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
