'use client'

import { useState, useEffect, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, FileText, Printer } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

interface PlanoAnualData {
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
    fundamentacao?: string
    objectivosGerais?: string
    avaliacao?: string
    bibliografia?: string
    unidades?: {
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
  teacher?: {
    name: string
    school?: string
  }
}

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

export default function PlanoAnualTemplatePage() {
  const params = useParams()
  const [plano, setPlano] = useState<PlanoAnualData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlano() {
      try {
        const res = await fetchWithAuth(`${API_ROUTES.PLANO_ANUAL}/${params.id}`)
        const data = await res.json()
        if (res.ok && data.data) {
          setPlano(data.data)
        } else {
          setError(data.error?.message || 'Plano anual não encontrado')
        }
      } catch {
        setError('Erro ao carregar plano anual')
      } finally {
        setIsLoading(false)
      }
    }
    if (params.id) fetchPlano()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error || !plano) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">{error || 'Plano não encontrado'}</h2>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/plano-anual/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    )
  }

  const c = plano.content
  const unidades = c.unidades || []

  return (
    <div className="min-h-screen bg-white text-black print:p-0">
      {/* Action bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b px-4 py-3 print:hidden">
        <Link
          href={`/plano-anual/${plano.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Plano
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">MOD.20.DEM.00</span>
          <Button onClick={() => window.print()} className="bg-black text-white hover:bg-gray-800">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] p-4 print:p-0 print:max-w-none">
        {/* Document */}
        <div className="border-2 border-black">
          {/* Header */}
          <div className="border-b-2 border-black p-4">
            <div className="mb-2 text-right text-sm font-medium">MOD.20.DEM.00</div>
            <h1 className="mb-6 text-center text-xl font-bold">PLANO DE ENSINO DA DISCIPLINA</h1>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-40 font-medium">Nome da instituição</span>
                <span className="flex-1 border-b border-black px-1 min-h-[1.5em]">
                  {plano.teacher?.school || ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-40 font-medium">Disciplina</span>
                <span className="flex-1 border-b border-black px-1 min-h-[1.5em]">
                  {plano.subject}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-40 font-medium">Regime</span>
                <span className="flex-1 border-b border-black px-1 min-h-[1.5em]">
                  {c.regime || ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Ano lectivo</span>
                  <span className="w-28 border-b border-black px-1 min-h-[1.5em]">
                    {plano.academicYear}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <span className="font-medium">Curso</span>
                  <span className="flex-1 border-b border-black px-1 min-h-[1.5em]">
                    {c.curso || ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Classe</span>
                  <span className="w-20 border-b border-black px-1 min-h-[1.5em]">
                    {plano.grade}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Horas semanais</span>
                  <span className="w-20 border-b border-black px-1 min-h-[1.5em]">
                    {c.horasSemanais || ''}
                  </span>
                </div>
                <div className="flex flex-1 items-center gap-2">
                  <span className="font-medium">Total de horas anual ou semestral</span>
                  <span className="flex-1 border-b border-black px-1 min-h-[1.5em]">
                    {c.totalHoras || ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap font-medium">Nº de aulas anuais ou semestrais incluindo as avaliações</span>
                <span className="flex-1 border-b border-black px-1 min-h-[1.5em]">
                  {c.numAulas || ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-40 font-medium">O professor</span>
                <span className="flex-1 border-b border-black px-1 min-h-[1.5em]">
                  {plano.teacher?.name || ''}
                </span>
              </div>

              {c.fundamentacao && (
                <div className="mt-4">
                  <div className="font-medium mb-1">Fundamentação ou justificativa da disciplina:</div>
                  <div className="border border-black p-2 whitespace-pre-wrap min-h-[60px]">
                    {c.fundamentacao}
                  </div>
                </div>
              )}

              {c.objectivosGerais && (
                <div className="mt-4">
                  <div className="font-medium mb-1">Objectivos gerais da disciplina:</div>
                  <div className="border border-black p-2 whitespace-pre-wrap min-h-[60px]">
                    {c.objectivosGerais}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Table */}
          <div className="p-4">
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 text-left font-medium w-1/5">
                    Objectivos específicos
                  </th>
                  <th className="border border-black p-2 text-left font-medium w-1/5">
                    Conteúdos
                  </th>
                  <th className="border border-black p-2 text-center font-medium w-16">
                    Nº de aulas
                  </th>
                  <th className="border border-black p-2 text-left font-medium w-1/5">
                    Métodos ou estratégias
                  </th>
                  <th className="border border-black p-2 text-left font-medium w-1/5">
                    Recursos ou meio de ensino
                  </th>
                </tr>
              </thead>
              <tbody>
                {unidades.map((unidade, i) => (
                  <Fragment key={i}>
                    <tr className="bg-gray-50">
                      <td className="border border-black p-2 font-semibold" colSpan={5}>
                        {unidade.nome || `Unidade ${toRoman(i + 1)}`}
                      </td>
                    </tr>
                    {unidade.topicos.map((topico, j) => (
                      <tr key={j}>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">
                          {topico.objectivosEspecificos || ''}
                        </td>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">
                          {topico.conteudos}
                        </td>
                        <td className="border border-black p-2 align-top text-center">
                          {topico.numAulas || ''}
                        </td>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">
                          {topico.metodos || ''}
                        </td>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">
                          {topico.recursos || ''}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {/* Avaliação */}
            {c.avaliacao && (
              <div className="mt-6">
                <div className="font-medium text-sm mb-1">Avaliação</div>
                <div className="border border-black p-2 text-sm whitespace-pre-wrap min-h-[80px]">
                  {c.avaliacao}
                </div>
              </div>
            )}

            {/* Bibliografia */}
            {c.bibliografia && (
              <div className="mt-4">
                <div className="font-medium text-sm mb-1">Bibliografia</div>
                <div className="border border-black p-2 text-sm whitespace-pre-wrap min-h-[80px]">
                  {c.bibliografia}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
        }
      `}</style>
    </div>
  )
}
