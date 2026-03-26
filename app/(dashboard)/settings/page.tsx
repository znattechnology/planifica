'use client'

import { useState } from 'react'
import {
  Settings,
  Sparkles,
  Globe,
  Bell,
  FileText,
  Palette,
  Monitor,
  Moon,
  Sun,
  Save,
  RotateCcw,
  Download,
  BookOpen,
  GraduationCap,
  Calendar,
  Clock,
  Type,
  Languages,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Input } from '@/src/ui/components/ui/input'
import { Label } from '@/src/ui/components/ui/label'
import { Select } from '@/src/ui/components/ui/select'

export default function SettingsPage() {
  // Aparência
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')

  // Idioma & Região
  const [language, setLanguage] = useState('pt-AO')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')

  // Preferências de IA
  const [aiModel, setAiModel] = useState('balanced')
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [includeMethodology, setIncludeMethodology] = useState(true)
  const [includeResources, setIncludeResources] = useState(true)
  const [includeAssessment, setIncludeAssessment] = useState(true)

  // Planos - Padrões
  const [defaultSubject, setDefaultSubject] = useState('')
  const [defaultGrade, setDefaultGrade] = useState('')
  const [defaultAcademicYear, setDefaultAcademicYear] = useState('2025')
  const [defaultLessonDuration, setDefaultLessonDuration] = useState('45')
  const [defaultHoursPerWeek, setDefaultHoursPerWeek] = useState('4')

  // Exportação
  const [exportFormat, setExportFormat] = useState('pdf')
  const [includeHeader, setIncludeHeader] = useState(true)
  const [includeFooter, setIncludeFooter] = useState(true)
  const [fontSize, setFontSize] = useState('12')

  // Notificações
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [planCompleted, setPlanCompleted] = useState(true)
  const [reportReady, setReportReady] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  const [saving, setSaving] = useState(false)

  const SUBJECTS = [
    'Matemática', 'Física', 'Química', 'Biologia', 'Língua Portuguesa',
    'Inglês', 'Francês', 'História', 'Geografia', 'Filosofia',
    'Educação Visual', 'Educação Física', 'Informática', 'Empreendedorismo',
  ]

  const GRADES = [
    '1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe', '5ª Classe',
    '6ª Classe', '7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe',
    '11ª Classe', '12ª Classe', '13ª Classe',
  ]

  async function handleSave() {
    setSaving(true)
    // TODO: API call
    await new Promise((r) => setTimeout(r, 1000))
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Definições</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure as preferências da plataforma e personalize a sua experiência.
          </p>
        </div>
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
              A guardar...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Definições
            </>
          )}
        </Button>
      </div>

      {/* Aparência */}
      <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Palette className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-base font-semibold">Aparência</h2>
        </div>

        <div className="space-y-4">
          <Label>Tema</Label>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {([
              { value: 'light', label: 'Claro', icon: Sun },
              { value: 'dark', label: 'Escuro', icon: Moon },
              { value: 'system', label: 'Sistema', icon: Monitor },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  theme === option.value
                    ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
                    : 'border-border/40 hover:border-accent/20'
                }`}
              >
                <option.icon className={`h-5 w-5 ${theme === option.value ? 'text-accent' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Idioma & Região */}
      <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Globe className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-base font-semibold">Idioma e Região</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="language">
              <Languages className="mr-1.5 inline h-3.5 w-3.5" />
              Idioma
            </Label>
            <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="pt-AO">Português (Angola)</option>
              <option value="pt-PT">Português (Portugal)</option>
              <option value="pt-BR">Português (Brasil)</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">
              <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
              Formato de Data
            </Label>
            <Select id="dateFormat" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
              <option value="DD/MM/YYYY">DD/MM/AAAA (31/12/2025)</option>
              <option value="MM/DD/YYYY">MM/DD/AAAA (12/31/2025)</option>
              <option value="YYYY-MM-DD">AAAA-MM-DD (2025-12-31)</option>
            </Select>
          </div>
        </div>
      </section>

      {/* Preferências de IA */}
      <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-base font-semibold">Preferências de IA</h2>
        </div>

        <div className="space-y-5">
          {/* AI Model */}
          <div className="space-y-2">
            <Label>Nível de Detalhe</Label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {([
                { value: 'concise', label: 'Conciso', desc: 'Planos mais curtos' },
                { value: 'balanced', label: 'Equilibrado', desc: 'Nível padrão' },
                { value: 'detailed', label: 'Detalhado', desc: 'Máximo detalhe' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAiModel(option.value)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    aiModel === option.value
                      ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20'
                      : 'border-border/40 hover:border-accent/20'
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            <Label>Conteúdos a incluir nos planos</Label>
            {[
              { label: 'Gerar planos automaticamente após criar dosificação', state: autoGenerate, setter: setAutoGenerate },
              { label: 'Incluir metodologia nos planos', state: includeMethodology, setter: setIncludeMethodology },
              { label: 'Incluir recursos e materiais', state: includeResources, setter: setIncludeResources },
              { label: 'Incluir critérios de avaliação', state: includeAssessment, setter: setIncludeAssessment },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-4 py-3"
              >
                <span className="text-sm">{item.label}</span>
                <button
                  type="button"
                  onClick={() => item.setter(!item.state)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    item.state ? 'bg-accent' : 'bg-secondary'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      item.state ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valores Padrão */}
      <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <BookOpen className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Valores Padrão</h2>
            <p className="text-xs text-muted-foreground">
              Pré-preenchidos automaticamente ao criar novos planos
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="defSubject">
              <GraduationCap className="mr-1.5 inline h-3.5 w-3.5" />
              Disciplina
            </Label>
            <Select id="defSubject" value={defaultSubject} onChange={(e) => setDefaultSubject(e.target.value)}>
              <option value="">Nenhuma</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defGrade">
              <GraduationCap className="mr-1.5 inline h-3.5 w-3.5" />
              Classe
            </Label>
            <Select id="defGrade" value={defaultGrade} onChange={(e) => setDefaultGrade(e.target.value)}>
              <option value="">Nenhuma</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defYear">
              <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
              Ano Lectivo
            </Label>
            <Input
              id="defYear"
              value={defaultAcademicYear}
              onChange={(e) => setDefaultAcademicYear(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defDuration">
              <Clock className="mr-1.5 inline h-3.5 w-3.5" />
              Duração da Aula (min)
            </Label>
            <Select id="defDuration" value={defaultLessonDuration} onChange={(e) => setDefaultLessonDuration(e.target.value)}>
              <option value="40">40 minutos</option>
              <option value="45">45 minutos</option>
              <option value="50">50 minutos</option>
              <option value="60">60 minutos</option>
              <option value="90">90 minutos</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defHours">
              <Clock className="mr-1.5 inline h-3.5 w-3.5" />
              Horas por Semana
            </Label>
            <Input
              id="defHours"
              type="number"
              min="1"
              max="40"
              value={defaultHoursPerWeek}
              onChange={(e) => setDefaultHoursPerWeek(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Exportação */}
      <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Download className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-base font-semibold">Exportação</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exportFormat">
              <FileText className="mr-1.5 inline h-3.5 w-3.5" />
              Formato Padrão
            </Label>
            <Select id="exportFormat" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="pdf">PDF</option>
              <option value="docx">Word (.docx)</option>
              <option value="both">PDF + Word</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fontSize">
              <Type className="mr-1.5 inline h-3.5 w-3.5" />
              Tamanho de Letra
            </Label>
            <Select id="fontSize" value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
              <option value="10">10pt</option>
              <option value="11">11pt</option>
              <option value="12">12pt (padrão)</option>
              <option value="14">14pt</option>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-3">
            {[
              { label: 'Incluir cabeçalho com logo da escola', state: includeHeader, setter: setIncludeHeader },
              { label: 'Incluir rodapé com data e página', state: includeFooter, setter: setIncludeFooter },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-4 py-3"
              >
                <span className="text-sm">{item.label}</span>
                <button
                  type="button"
                  onClick={() => item.setter(!item.state)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    item.state ? 'bg-accent' : 'bg-secondary'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      item.state ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notificações */}
      <section className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Bell className="h-4 w-4 text-accent" />
          </div>
          <h2 className="text-base font-semibold">Notificações</h2>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Notificações por email', desc: 'Receber notificações no email registado', state: emailNotifications, setter: setEmailNotifications },
            { label: 'Plano concluído', desc: 'Quando um plano terminar de ser gerado', state: planCompleted, setter: setPlanCompleted },
            { label: 'Relatório pronto', desc: 'Quando um relatório ficar disponível', state: reportReady, setter: setReportReady },
            { label: 'Resumo semanal', desc: 'Receber um resumo da actividade da semana', state: weeklyDigest, setter: setWeeklyDigest },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => item.setter(!item.state)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  item.state ? 'bg-accent' : 'bg-secondary'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    item.state ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Actions */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            As definições são guardadas automaticamente na sua conta.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-border/60">
            <RotateCcw className="mr-2 h-4 w-4" />
            Repor Padrões
          </Button>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
