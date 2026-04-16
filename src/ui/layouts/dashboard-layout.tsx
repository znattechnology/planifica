'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/src/ui/providers/auth-provider'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  BarChart3,
  Shield,
  Users,
  Settings,
  User,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronLeft,
  Plus,
  CreditCard,
  Crown,
  Star,
  Settings2,
} from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { cn } from '@/src/shared/lib/utils'
import { ROUTES, API_ROUTES } from '@/src/shared/constants/routes.constants'
import { UpgradeBanner } from '@/src/ui/components/subscription/upgrade-banner'
import { PaymentModal } from '@/src/ui/components/subscription/payment-modal'
import { fetchWithAuth } from '@/src/shared/lib/fetch-with-auth'
import { useSubscription } from '@/src/ui/providers/subscription-provider'

interface DashboardLayoutProps {
  children: ReactNode
}

type NavLink = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type NavSection = {
  section: string
  items: NavLink[]
}

type NavItem = NavLink | NavSection

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: 'Plano Anual da Disciplina',
    href: ROUTES.PLANO_ANUAL,
    icon: BookOpen,
  },
  {
    section: 'Dosificações e Planos',
    items: [
      { label: 'Dosificação Anual', href: ROUTES.PLANS_ANNUAL, icon: Calendar },
      { label: 'Dosificação Trimestral', href: ROUTES.PLANS_TRIMESTER, icon: CalendarDays },
      { label: 'Dosificação Quinzenal', href: ROUTES.PLANS_BIWEEKLY, icon: CalendarRange },
      { label: 'Planos de Aula', href: ROUTES.PLANS_LESSON, icon: GraduationCap },
    ],
  },
  {
    label: 'Actividades',
    href: ROUTES.ACTIVITIES,
    icon: ClipboardCheck,
  },
  {
    label: 'Calendário Escolar',
    href: ROUTES.CALENDAR,
    icon: CalendarCheck,
  },
  {
    label: 'Gerar Relatórios',
    href: ROUTES.REPORTS,
    icon: BarChart3,
  },
  {
    label: 'Subscrição',
    href: ROUTES.SUBSCRIPTION,
    icon: Star,
  },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    section: 'Administração',
    items: [
      { label: 'Painel Admin', href: ROUTES.ADMIN, icon: Shield },
      { label: 'Professores', href: ROUTES.ADMIN_TEACHERS, icon: Users },
      { label: 'Todos os Planos', href: ROUTES.ADMIN_PLANS, icon: BarChart3 },
      { label: 'Calendários', href: ROUTES.ADMIN_CALENDARS, icon: CalendarDays },
      { label: 'Pagamentos', href: ROUTES.ADMIN_PAYMENTS, icon: CreditCard },
      { label: 'Subscrições', href: ROUTES.ADMIN_SUBSCRIPTIONS, icon: Crown },
      { label: 'Planos de Subscrição', href: ROUTES.ADMIN_SUBSCRIPTION_PLANS, icon: Settings2 },
    ],
  },
]

const BOTTOM_ITEMS = [
  { label: 'Definições', href: ROUTES.SETTINGS, icon: Settings },
  { label: 'Perfil', href: ROUTES.PROFILE, icon: User },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{
    reference: string; amount: number; expiresAt: string
  } | null>(null)
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const { refresh: refreshSubscription } = useSubscription()

  async function handleBannerUpgrade() {
    try {
      const res = await fetchWithAuth(API_ROUTES.SUBSCRIPTIONS_UPGRADE, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const { payment } = data.data as { payment: { reference: string; amount: number; expiresAt: string } }
        setUpgradeModal({ reference: payment.reference, amount: payment.amount, expiresAt: payment.expiresAt })
        await refreshSubscription()
      }
    } catch {
      // user can upgrade from the dashboard card
    }
  }

  const isAdminOrCoordinator = user?.role === 'ADMIN' || user?.role === 'COORDINATOR'
  const navItems = isAdminOrCoordinator ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/40 bg-card transition-all duration-300 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border/40 px-4">
          {!collapsed && (
            <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <span className="text-sm font-bold text-accent-foreground">P</span>
              </div>
              <span className="text-lg font-semibold tracking-tight">Planifica</span>
            </Link>
          )}
          {collapsed && (
            <Link href={ROUTES.DASHBOARD} className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <span className="text-sm font-bold text-accent-foreground">P</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New Plan Button */}
        <div className="p-3">
          <Button
            className={cn(
              'bg-accent text-accent-foreground hover:bg-accent/90',
              collapsed ? 'w-full justify-center px-0' : 'w-full',
            )}
            size="sm"
            asChild
          >
            <Link href={ROUTES.PLANS_NEW}>
              <Plus className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Novo Plano</span>}
            </Link>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item, i) => {
            if ('section' in item) {
              const group = item as NavSection
              return (
                <div key={i} className="pt-4">
                  {!collapsed && (
                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.section}
                    </p>
                  )}
                  {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-border" />}
                  <div className="space-y-0.5">
                    {group.items.map((sub) => (
                      <NavItem
                        key={sub.href}
                        href={sub.href}
                        label={sub.label}
                        icon={sub.icon}
                        active={pathname === sub.href || pathname.startsWith(sub.href.split('?')[0])}
                        collapsed={collapsed}
                        onClick={() => setSidebarOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              )
            }
            const link = item as NavLink
            return (
              <NavItem
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                active={pathname === link.href}
                collapsed={collapsed}
                onClick={() => setSidebarOpen(false)}
              />
            )
          })}
        </nav>

        {/* Bottom Nav */}
        <div className="border-t border-border/40 p-3 space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              collapsed={collapsed}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
          <button
            onClick={logout}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>

        {/* Collapse Toggle (desktop only) */}
        <div className="hidden border-t border-border/40 p-2 lg:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>

      {/* Upgrade modal (triggered from banner) */}
      {upgradeModal && (
        <PaymentModal
          reference={upgradeModal.reference}
          amount={upgradeModal.amount}
          expiresAt={upgradeModal.expiresAt}
          onClose={() => setUpgradeModal(null)}
        />
      )}

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center gap-4 border-b border-border/40 bg-card/50 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground sm:text-sm">
                Assistente IA disponível
              </span>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
                <span className="text-sm font-semibold text-accent">U</span>
              </div>
            </div>
          </div>
        </header>

        {/* Upgrade Banner — contextual, between header and page content */}
        <UpgradeBanner onUpgradeClick={handleBannerUpgrade} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent/10 font-medium text-accent'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        collapsed && 'justify-center px-0',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
