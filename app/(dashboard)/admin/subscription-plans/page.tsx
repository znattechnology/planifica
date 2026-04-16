'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Settings2,
  Loader2,
  RefreshCw,
  Pencil,
  Plus,
  Check,
  X,
  Infinity,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { Badge } from '@/src/ui/components/ui/badge'
import { Skeleton } from '@/src/ui/components/ui/loading'
import { API_ROUTES } from '@/src/shared/constants/routes.constants'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { useAuth } from '@/src/ui/providers/auth-provider'
import { cn } from '@/src/shared/lib/utils'

interface SubscriptionPlanConfig {
  id: string
  slug: string
  name: string
  priceKz: number
  durationDays: number
  plansPerMonth: number
  paymentExpiryHours: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type EditForm = Omit<SubscriptionPlanConfig, 'id' | 'createdAt' | 'updatedAt'>

const emptyForm = (): EditForm => ({
  slug: '',
  name: '',
  priceKz: 0,
  durationDays: 30,
  plansPerMonth: -1,
  paymentExpiryHours: 24,
  isActive: true,
})

export default function SubscriptionPlansPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(emptyForm())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<EditForm>(emptyForm())
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchPlans = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetchWithAuth(API_ROUTES.ADMIN_SUBSCRIPTION_PLANS)
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || 'Erro ao carregar planos')
      setPlans(data.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de ligação')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  if (authLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">Acesso restrito a administradores.</p>
      </div>
    )
  }

  function startEdit(plan: SubscriptionPlanConfig) {
    setEditingId(plan.id)
    setSaveError('')
    setEditForm({
      slug: plan.slug,
      name: plan.name,
      priceKz: plan.priceKz,
      durationDays: plan.durationDays,
      plansPerMonth: plan.plansPerMonth,
      paymentExpiryHours: plan.paymentExpiryHours,
      isActive: plan.isActive,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setSaveError('')
  }

  async function saveEdit(id: string) {
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await fetchWithAuth(`${API_ROUTES.ADMIN_SUBSCRIPTION_PLANS}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          priceKz: Number(editForm.priceKz),
          durationDays: Number(editForm.durationDays),
          plansPerMonth: Number(editForm.plansPerMonth),
          paymentExpiryHours: Number(editForm.paymentExpiryHours),
          isActive: editForm.isActive,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || 'Erro ao guardar')
      setPlans(prev => prev.map(p => p.id === id ? data.data : p))
      setEditingId(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro de ligação')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreate() {
    setIsCreating(true)
    setCreateError('')
    try {
      const res = await fetchWithAuth(API_ROUTES.ADMIN_SUBSCRIPTION_PLANS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: createForm.slug,
          name: createForm.name,
          priceKz: Number(createForm.priceKz),
          durationDays: Number(createForm.durationDays),
          plansPerMonth: Number(createForm.plansPerMonth),
          paymentExpiryHours: Number(createForm.paymentExpiryHours),
          isActive: createForm.isActive,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message || 'Erro ao criar plano')
      setPlans(prev => [...prev, data.data])
      setShowCreate(false)
      setCreateForm(emptyForm())
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erro de ligação')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Settings2 className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Planos de Subscrição</h1>
            <p className="text-sm text-muted-foreground">Configurar preços, limites e duração dos planos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchPlans} disabled={isLoading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isLoading && 'animate-spin')} />
            Actualizar
          </Button>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setShowCreate(true); setCreateForm(emptyForm()); setCreateError('') }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-4">
          <p className="text-sm font-semibold">Novo Plano de Subscrição</p>
          <PlanForm
            form={createForm}
            onChange={setCreateForm}
            slugEditable
          />
          {createError && <p className="text-xs text-destructive">{createError}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              Criar Plano
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Plans list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {plans.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">
              Nenhum plano configurado. Crie o primeiro plano.
            </p>
          )}
          {plans.map(plan => (
            <div
              key={plan.id}
              className={cn(
                'rounded-xl border p-5 space-y-4',
                plan.isActive ? 'border-border/40 bg-card' : 'border-border/20 bg-secondary/20 opacity-60',
              )}
            >
              {editingId === plan.id ? (
                <>
                  <PlanForm form={editForm} onChange={setEditForm} slugEditable={false} />
                  {saveError && <p className="text-xs text-destructive">{saveError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => saveEdit(plan.id)} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{plan.slug}</Badge>
                        {!plan.isActive && (
                          <Badge className="border-destructive/30 bg-destructive/10 text-destructive text-xs">Inactivo</Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Editar
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCell label="Preço" value={`${plan.priceKz.toLocaleString('pt-AO')} Kz`} />
                    <StatCell label="Duração" value={`${plan.durationDays} dias`} />
                    <StatCell
                      label="Planos/mês"
                      value={plan.plansPerMonth === -1 ? <><Infinity className="h-4 w-4 inline" /> Ilimitado</> : String(plan.plansPerMonth)}
                    />
                    <StatCell label="Expiração pag." value={`${plan.paymentExpiryHours}h`} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/30 bg-secondary/30 px-3 py-2.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  )
}

function PlanForm({
  form,
  onChange,
  slugEditable,
}: {
  form: EditForm
  onChange: (f: EditForm) => void
  slugEditable: boolean
}) {
  function field(key: keyof EditForm) {
    return {
      value: String(form[key]),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        onChange({ ...form, [key]: e.target.value }),
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Slug (identificador único)" required>
        <input
          {...field('slug')}
          disabled={!slugEditable}
          placeholder="ex: ENTERPRISE"
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </Field>
      <Field label="Nome do plano" required>
        <input {...field('name')} placeholder="ex: Plano Empresarial" className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
      </Field>
      <Field label="Preço (Kz)">
        <input {...field('priceKz')} type="number" min="0" step="100" className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
      </Field>
      <Field label="Duração (dias)">
        <input {...field('durationDays')} type="number" min="1" className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
      </Field>
      <Field label="Planos por mês (-1 = ilimitado)">
        <input {...field('plansPerMonth')} type="number" min="-1" className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
      </Field>
      <Field label="Expiração do pagamento (horas)">
        <input {...field('paymentExpiryHours')} type="number" min="1" className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
      </Field>
      <Field label="Estado">
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={e => onChange({ ...form, isActive: e.target.checked })}
            className="h-4 w-4 accent-accent rounded"
          />
          <span className="text-sm">Plano activo</span>
        </label>
      </Field>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
