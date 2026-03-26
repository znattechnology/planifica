'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, FileText, Printer } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'

interface LessonPhaseData {
  name: string
  duration: string
  content?: string
  activities: string[]
  methods?: string
  resources?: string
  assessment?: string
}

interface WeeklyPlanData {
  week: string
  period?: string
  unit: string
  objectives: string
  contents: string
  numLessons: number
}

interface PlanData {
  id: string
  title: string
  subject: string
  grade: string
  academicYear: string
  type: string
  trimester?: number
  createdAt: string
  teacher?: {
    name: string
    school?: string
  }
  content: {
    topic?: string
    duration?: number
    lessonType?: string
    lessonNumber?: number
    didacticUnit?: string
    summary?: string
    generalObjectives?: string[]
    specificObjectives?: string[]
    objectives?: string[]
    competencies?: string[]
    topics?: { title: string; subtopics?: string[]; duration?: string; week?: number }[]
    lessonPhases?: LessonPhaseData[]
    methodology?: string | Record<string, unknown>
    resources?: string[]
    assessment?: string | Record<string, unknown>
    homework?: string
    bibliography?: string[]
    criticalNotes?: string
    observations?: string
    weeklyPlan?: WeeklyPlanData[]
    totalWeeks?: number
    totalLessons?: number
  }
}

function getPhase(phases: LessonPhaseData[] | undefined, keyword: string): LessonPhaseData | undefined {
  if (!phases) return undefined
  return phases.find(p => p.name.toLowerCase().includes(keyword.toLowerCase()))
}

function formatText(value: string | Record<string, unknown> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join('\n')
}

// ══════════════════════════════════════════════
// LESSON PLAN TEMPLATE — MOD.06.DEM.01
// ══════════════════════════════════════════════
function LessonTemplate({ plan }: { plan: PlanData }) {
  const c = plan.content
  const inicio = getPhase(c.lessonPhases, 'início') || getPhase(c.lessonPhases, 'inicio') || getPhase(c.lessonPhases, 'motivação') || getPhase(c.lessonPhases, 'introdução')
  const desenvolvimento = getPhase(c.lessonPhases, 'desenvolvimento')
  const conclusao = getPhase(c.lessonPhases, 'conclusão') || getPhase(c.lessonPhases, 'conclusao') || getPhase(c.lessonPhases, 'verificação') || getPhase(c.lessonPhases, 'síntese')
  const tpc = getPhase(c.lessonPhases, 'tarefa') || getPhase(c.lessonPhases, 'tpc') || getPhase(c.lessonPhases, 'orientação')

  const generalObjs = c.generalObjectives || c.objectives || []
  const specificObjs = c.specificObjectives || []

  return (
    <>
      {/* PÁGINA 1: Cabeçalho + Objectivos */}
      <div className="mb-6 border-2 border-black print:mb-0">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2" style={{ backgroundColor: '#FFF3B0' }}>
          <h1 className="text-lg font-bold">PLANO DE AULA</h1>
          <span className="text-sm font-semibold">MOD.06.DEM.01</span>
        </div>

        <div className="border-b border-black p-2 text-sm">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <span>Nome do Professor:</span>
            <span className="border-b border-black px-2 font-medium min-w-[150px]">{plan.teacher?.name || '________________________'}</span>
            <span>/Curso:</span>
            <span className="border-b border-black px-2 font-medium">{plan.grade}</span>
            <span>/Classe:</span>
            <span className="border-b border-black px-2 font-medium">{plan.grade}</span>
            <span>/Turma:</span>
            <span className="border-b border-black px-2 font-medium">___</span>
            <span>/Data:</span>
            <span className="border-b border-black px-2 font-medium">___/___/{plan.academicYear}</span>
          </div>
        </div>

        <div className="border-b border-black p-2 text-sm">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <span>Disciplina:</span>
            <span className="border-b border-black px-2 font-medium">{plan.subject}</span>
            <span>- Aula Nº:</span>
            <span className="border-b border-black px-2 font-medium">{c.lessonNumber || '___'}</span>
            <span>/ Hora, das</span>
            <span className="border-b border-black px-2 font-medium">___:___</span>
            <span>às</span>
            <span className="border-b border-black px-2 font-medium">___:___</span>
            <span>/ Tipo de aula:</span>
            <span className="border-b border-black px-2 font-medium">{c.lessonType || 'Teórico-Prática'}</span>
          </div>
        </div>

        <div className="border-b border-black p-2 text-sm">
          <span className="font-semibold">Unidade Didáctica: </span>
          <span>{c.didacticUnit || c.topic || '—'}</span>
        </div>

        <div className="border-b border-black p-2 text-sm">
          <div className="font-semibold mb-1">Sumário:</div>
          <div className="whitespace-pre-line min-h-[60px]">
            {c.summary || c.topics?.map((t, i) => `${i + 1}. ${t.title}`).join('\n') || '—'}
          </div>
        </div>

        <div className="border-b border-black p-2 text-sm">
          <div className="font-semibold mb-1">Objectivo Geral:</div>
          <div className="whitespace-pre-line min-h-[40px]">
            {generalObjs.map((obj) => `• ${obj}`).join('\n') || '—'}
          </div>
        </div>

        <div className="p-2 text-sm">
          <div className="font-semibold mb-1">Objectivos Específicos:</div>
          <div className="whitespace-pre-line min-h-[40px]">
            {specificObjs.length > 0 ? specificObjs.map((obj) => `• ${obj}`).join('\n') : '—'}
          </div>
        </div>
      </div>

      {/* PÁGINA 2: Tabela Início + Desenvolvimento */}
      <div className="mb-6 border-2 border-black print:break-before-page print:mb-0">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2" style={{ backgroundColor: '#FFF3B0' }}>
          <h1 className="text-lg font-bold">PLANO DE AULA</h1>
          <span className="text-sm font-semibold">MOD.06.DEM.01</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: '#FFF3B0' }}>
                <th className="border border-black p-2 text-left font-semibold w-28">ETAPAS DA AULA</th>
                <th className="border border-black p-2 text-left font-semibold">CONTEÚDO</th>
                <th className="border border-black p-2 text-left font-semibold">ACTIVIDADES</th>
                <th className="border border-black p-2 text-left font-semibold">MÉTODOS / ESTRATÉGIAS</th>
                <th className="border border-black p-2 text-left font-semibold">RECURSOS DIDÁCTICOS</th>
                <th className="border border-black p-2 text-left font-semibold">AVALIAÇÃO</th>
                <th className="border border-black p-2 text-left font-semibold w-20">TEMPO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 align-top font-semibold bg-gray-50">
                  <div>Início</div>
                  <div className="text-xs font-normal">(Motivação)</div>
                </td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{inicio?.content || 'Saudar os estudantes\nControlar as presenças\nMotivação\nAnunciar o sumário'}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{inicio?.activities?.join('\n') || '—'}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{inicio?.methods || 'Expositivo\nInterrogativo'}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{inicio?.resources || (c.resources || []).join('\n') || 'Quadro\nGiz'}</td>
                <td className="border border-black p-2 align-top">{inicio?.assessment || 'Oral'}</td>
                <td className="border border-black p-2 align-top text-center font-medium">{inicio?.duration || '5 min'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 align-top font-semibold bg-gray-50">Desenvolvimento</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{desenvolvimento?.content || c.topics?.map(t => t.title).join('\n') || '—'}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{desenvolvimento?.activities?.join('\n') || '—'}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{desenvolvimento?.methods || formatText(c.methodology) || 'Expositivo\nInterrogativo\nDemonstrativo'}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{desenvolvimento?.resources || (c.resources || []).join('\n') || '—'}</td>
                <td className="border border-black p-2 align-top">{desenvolvimento?.assessment || 'Oral\nEscrita'}</td>
                <td className="border border-black p-2 align-top text-center font-medium">{desenvolvimento?.duration || '25 min'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PÁGINA 3: Conclusão + TPC + Bibliografia */}
      <div className="mb-6 border-2 border-black print:break-before-page print:mb-0">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2" style={{ backgroundColor: '#FFF3B0' }}>
          <h1 className="text-lg font-bold">PLANO DE AULA</h1>
          <span className="text-sm font-semibold">MOD.06.DEM.01</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-black p-2 align-top font-semibold bg-gray-50 w-28">
                  <div>Conclusão</div>
                  <div className="text-xs font-normal">(Verificação e Síntese)</div>
                </td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{conclusao?.content || 'Resumo do conteúdo abordado'}</td>
                <td className="border border-black p-2 align-top whitespace-pre-line">{conclusao?.activities?.join('\n') || 'Esclarecer dúvidas\nSíntese da aula'}</td>
                <td className="border border-black p-2 align-top">{conclusao?.methods || 'Expositivo'}</td>
                <td className="border border-black p-2 align-top">{conclusao?.resources || 'Quadro'}</td>
                <td className="border border-black p-2 align-top">{conclusao?.assessment || 'Oral'}</td>
                <td className="border border-black p-2 align-top text-center font-medium w-20">{conclusao?.duration || '10 min'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 align-top font-semibold bg-gray-50">
                  <div>Orientação da Tarefa</div>
                  <div className="text-xs font-normal">(TPC)</div>
                </td>
                <td className="border border-black p-2 align-top whitespace-pre-line" colSpan={5}>
                  {tpc?.content || c.homework || '—'}
                </td>
                <td className="border border-black p-2 align-top text-center font-medium">{tpc?.duration || '5 min'}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 align-top font-semibold bg-gray-50">Bibliografia</td>
                <td className="border border-black p-2 align-top whitespace-pre-line" colSpan={6}>
                  {c.bibliography?.map((b, i) => `${i + 1}. ${b}`).join('\n') || '—'}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 align-top font-semibold bg-gray-50">
                  <div>Notas Críticas</div>
                  <div className="text-xs font-normal">(opcional)</div>
                </td>
                <td className="border border-black p-2 align-top whitespace-pre-line min-h-[60px]" colSpan={6}>
                  {c.criticalNotes || c.observations || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ══════════════════════════════════════════════
// DOSIFICAÇÃO TEMPLATE — MOD.20.DEM.00 (Anual) / MOD.10.DEM.00 (Trimestral)
// Shared template for both ANNUAL and TRIMESTER plans
// ══════════════════════════════════════════════
function DosificacaoTemplate({ plan }: { plan: PlanData }) {
  const c = plan.content
  const isAnnual = plan.type === 'ANNUAL'
  const weeklyPlan = c.weeklyPlan || []
  const totalLessons = c.totalLessons || weeklyPlan.reduce((sum, w) => sum + w.numLessons, 0)

  const title = isAnnual ? 'DOSIFICAÇÃO ANUAL' : 'DOSIFICAÇÃO TRIMESTRAL'
  const modelCode = isAnnual ? 'MOD.20.DEM.00' : 'MOD.10.DEM.00'
  const totalLabel = isAnnual ? 'Total de Aulas / Ano Lectivo:' : 'Total de Aulas por Semana / Trimestre:'

  return (
    <div className="mb-6 rounded-lg border-2 border-black print:mb-0 print:rounded-none">
      {/* Título + Código do modelo */}
      <div className="flex items-center justify-between px-6 py-2" style={{ backgroundColor: '#FFF3B0' }}>
        <span className="text-base font-bold">{title}</span>
        <span className="text-sm font-medium text-gray-600">{modelCode}</span>
      </div>

      {/* Cabeçalho */}
      <div className="px-6 pb-4 pt-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {isAnnual ? (
            <div>
              <span className="text-sm font-semibold">Dosificação Anual: </span>
              <span className="text-sm font-medium">{plan.academicYear}</span>
            </div>
          ) : (
            <div>
              <span className="text-sm font-semibold">Dosificação Trimestral: </span>
              <span className="text-sm font-medium">{plan.trimester ? `${['I', 'II', 'III'][plan.trimester - 1]} Trimestre` : 'I Trimestre'}</span>
            </div>
          )}
          <div>
            <span className="text-sm font-semibold">Disciplina: </span>
            <span className="text-sm">{plan.subject}</span>
          </div>
          <div>
            <span className="text-sm font-semibold">Classe: </span>
            <span className="text-sm">{plan.grade}</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <span className="text-sm font-semibold">Ano Lectivo: </span>
            <span className="text-sm">{plan.academicYear}</span>
          </div>
          <div>
            <span className="text-sm font-semibold">Professor: </span>
            <span className="text-sm">{plan.teacher?.name || '________________________'}</span>
          </div>
          <div>
            <span className="text-sm font-semibold">Escola: </span>
            <span className="text-sm">{plan.teacher?.school || '________________________'}</span>
          </div>
        </div>
      </div>

      {/* Tabela de semanas */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: '#FFF3B0' }}>
              <th className="border border-black px-3 py-2 text-left font-semibold" style={{ width: '120px' }}>Semana Lectiva</th>
              <th className="border border-black px-3 py-2 text-left font-semibold" style={{ width: '80px' }}>Unidade</th>
              <th className="border border-black px-3 py-2 text-left font-semibold">Objectivos</th>
              <th className="border border-black px-3 py-2 text-left font-semibold">Conteúdos</th>
              <th className="border border-black px-3 py-2 text-center font-semibold" style={{ width: '100px' }}>Nº de Aulas</th>
            </tr>
          </thead>
          <tbody>
            {weeklyPlan.length > 0 ? (
              weeklyPlan.map((week, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                  <td className="border border-black px-3 py-2 align-top">
                    <div className="font-medium text-center">{week.week}</div>
                    {week.period && (
                      <div className="text-xs text-gray-500 text-center mt-1 whitespace-pre-line">{week.period}</div>
                    )}
                  </td>
                  <td className="border border-black px-3 py-2 align-top text-center font-medium">
                    {week.unit}
                  </td>
                  <td className="border border-black px-3 py-2 align-top whitespace-pre-line">
                    {week.objectives}
                  </td>
                  <td className="border border-black px-3 py-2 align-top whitespace-pre-line">
                    {week.contents}
                  </td>
                  <td className="border border-black px-3 py-2 align-top text-center">
                    {week.numLessons}
                  </td>
                </tr>
              ))
            ) : (
              // Fallback: build from topics
              (c.topics || []).map((topic, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                  <td className="border border-black px-3 py-2 align-top text-center font-medium">
                    {topic.week ? `${topic.week}ª` : `${i + 1}ª`}
                  </td>
                  <td className="border border-black px-3 py-2 align-top text-center font-medium">
                    {['I', 'II', 'III', 'IV', 'V', 'VI'][Math.floor(i / 3)] || 'I'}
                  </td>
                  <td className="border border-black px-3 py-2 align-top whitespace-pre-line">
                    {(c.specificObjectives || c.generalObjectives || c.objectives || [])[i] || '—'}
                  </td>
                  <td className="border border-black px-3 py-2 align-top whitespace-pre-line">
                    {topic.title}{topic.subtopics?.length ? '\n' + topic.subtopics.join('\n') : ''}
                  </td>
                  <td className="border border-black px-3 py-2 align-top text-center">2</td>
                </tr>
              ))
            )}
            {/* Total row */}
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={4} className="border border-black px-3 py-2 text-right">
                {totalLabel}
              </td>
              <td className="border border-black px-3 py-2 text-center">
                {totalLessons}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between px-6 py-3 text-sm text-gray-500 border-t border-black">
        <div>
          <span className="font-medium">Total de Semanas:</span> {c.totalWeeks || weeklyPlan.length || c.topics?.length || 0}
        </div>
        <div>
          <span className="font-medium">Total de Aulas:</span> {totalLessons}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// BIWEEKLY PLAN TEMPLATE — MOD.47.DEM.00
// ══════════════════════════════════════════════
function BiweeklyTemplate({ plan }: { plan: PlanData }) {
  const c = plan.content
  const topics = c.topics || []
  const generalObjs = c.generalObjectives || c.objectives || []

  return (
    <div className="mb-6 border-2 border-black print:mb-0">
      {/* Header */}
      <div className="border-b-2 border-black px-6 py-3 text-center">
        <h1 className="text-xl font-bold">PLANO QUINZENAL</h1>
        <p className="text-sm text-gray-500 mt-0.5">MOD.47.DEM.00</p>
      </div>

      {/* Form Fields */}
      <div className="px-6 py-4 space-y-3 border-b border-black text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold whitespace-nowrap">PLANIFICAÇÃO REFERENTE A:</span>
          <span className="flex-1 border-b border-black px-2 min-h-[1.5em]">
            {plan.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold whitespace-nowrap">ANO LECTIVO:</span>
          <span className="border-b border-black px-2 min-w-[100px]">{plan.academicYear}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold whitespace-nowrap">Professor:</span>
          <span className="flex-1 border-b border-black px-2 min-h-[1.5em]">
            {plan.teacher?.name || ''}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold whitespace-nowrap">Disciplina:</span>
          <span className="border-b border-black px-2 min-w-[120px]">{plan.subject}</span>
          <span className="font-semibold whitespace-nowrap">/Curso(s):</span>
          <span className="border-b border-black px-2 min-w-[100px]">{plan.grade}</span>
          <span className="font-semibold whitespace-nowrap">/Classe(s):</span>
          <span className="border-b border-black px-2 min-w-[60px]">{plan.grade}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold whitespace-nowrap">Unidade Didáctica:</span>
          <span className="flex-1 border-b border-black px-2 min-h-[1.5em]">
            {topics.length > 0 ? topics[0].title : ''}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="font-semibold whitespace-nowrap mt-0.5">Objectivo Geral:</span>
          <span className="flex-1 border-b border-black px-2 min-h-[2.5em] whitespace-pre-line">
            {generalObjs.join('\n') || ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-center font-semibold w-16">AULA</th>
              <th className="border border-black p-2 text-center font-semibold">CONTEÚDO PROGRAMÁTICO</th>
              <th className="border border-black p-2 text-center font-semibold">OBJECTIVOS ESPECÍFICOS</th>
              <th className="border border-black p-2 text-center font-semibold">ESTRATÉGIAS DE ENSINO</th>
              <th className="border border-black p-2 text-center font-semibold">EXPECTATIVAS DE APRENDIZAGEM</th>
              <th className="border border-black p-2 text-center font-semibold">AVALIAÇÃO/ INSTRUMENTOS</th>
            </tr>
          </thead>
          <tbody>
            {topics.length > 0 ? (
              topics.map((topic, i) => {
                const specificObj = (c.specificObjectives || [])[i] || ''
                return (
                  <tr key={i}>
                    <td className="border border-black p-2 text-center align-top font-medium">
                      {topic.week || i + 1}
                    </td>
                    <td className="border border-black p-2 align-top whitespace-pre-line">
                      {topic.title}
                      {topic.subtopics?.length ? '\n' + topic.subtopics.map(s => `• ${s}`).join('\n') : ''}
                    </td>
                    <td className="border border-black p-2 align-top whitespace-pre-line">
                      {specificObj}
                    </td>
                    <td className="border border-black p-2 align-top whitespace-pre-line">
                      {formatText(c.methodology) || ''}
                    </td>
                    <td className="border border-black p-2 align-top whitespace-pre-line">
                      {(c.competencies || [])[i] || (c.competencies || []).join('\n') || ''}
                    </td>
                    <td className="border border-black p-2 align-top whitespace-pre-line">
                      {formatText(c.assessment) || ''}
                    </td>
                  </tr>
                )
              })
            ) : (
              // Empty rows as fallback
              [1, 2, 3].map(n => (
                <tr key={n}>
                  <td className="border border-black p-2 text-center align-top">{n}</td>
                  <td className="border border-black p-2 align-top min-h-[80px]">&nbsp;</td>
                  <td className="border border-black p-2 align-top">&nbsp;</td>
                  <td className="border border-black p-2 align-top">&nbsp;</td>
                  <td className="border border-black p-2 align-top">&nbsp;</td>
                  <td className="border border-black p-2 align-top">&nbsp;</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Signatures */}
      <div className="px-6 py-4 border-t border-black">
        <div className="flex flex-wrap justify-between items-end gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">O Professor:</span>
            <span className="border-b border-black px-2 min-w-[150px]">
              {plan.teacher?.name || ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">O Coordenador de Curso/Disciplina:</span>
            <span className="border-b border-black px-2 min-w-[150px]">&nbsp;</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Data:</span>
            <span className="border-b border-black px-2 min-w-[100px]">___/___/20__</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════
export default function PlanTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetchWithAuth(`${API_ROUTES.PLANS}/${params.id}`)
        const data = await res.json()
        if (res.ok && data.data) {
          const planType = data.data.type
          if (planType !== 'LESSON' && planType !== 'TRIMESTER' && planType !== 'BIWEEKLY' && planType !== 'ANNUAL') {
            setError('Modelo oficial não disponível para este tipo de plano')
            return
          }
          setPlan(data.data)
        } else {
          setError(data.error?.message || 'Plano não encontrado')
        }
      } catch {
        setError('Erro ao carregar plano')
      } finally {
        setIsLoading(false)
      }
    }
    if (params.id) fetchPlan()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">{error || 'Plano não encontrado'}</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    )
  }

  const modelCode = plan.type === 'LESSON' ? 'MOD.06.DEM.01' : plan.type === 'BIWEEKLY' ? 'MOD.47.DEM.00' : plan.type === 'ANNUAL' ? 'MOD.20.DEM.00' : 'MOD.10.DEM.00'

  return (
    <div className="min-h-screen bg-white text-black print:p-0">
      {/* Action bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b px-4 py-3 print:hidden">
        <Link
          href={`/plans/${plan.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Plano
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{modelCode}</span>
          <Button onClick={() => window.print()} className="bg-black text-white hover:bg-gray-800">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-4 print:p-0 print:max-w-none">
        {plan.type === 'LESSON' ? <LessonTemplate plan={plan} /> : plan.type === 'BIWEEKLY' ? <BiweeklyTemplate plan={plan} /> : <DosificacaoTemplate plan={plan} />}
      </div>

      <style jsx>{`
        @media print {
          @page {
            margin: 10mm;
            size: ${plan.type === 'LESSON' ? 'A4 landscape' : 'A4 landscape'};
          }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:mb-0 { margin-bottom: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:break-before-page { break-before: page; }
        }
      `}</style>
    </div>
  )
}
