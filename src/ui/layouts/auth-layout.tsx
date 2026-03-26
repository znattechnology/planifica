'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        {/* Background */}
        <div className="absolute inset-0 bg-background" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col items-center justify-center px-12">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <span className="text-lg font-bold text-accent-foreground">P</span>
            </div>
            <span className="text-2xl font-semibold tracking-tight">Planifica</span>
          </Link>

          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm text-accent">
              <Sparkles className="h-4 w-4" />
              Alimentado por IA
            </div>
            <h2 className="text-balance text-3xl font-bold tracking-tight">
              Planeamento inteligente para{' '}
              <span className="text-accent">professores do futuro</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Crie planos anuais, trimestrais e de aulas automaticamente.
              Poupe tempo e concentre-se no que realmente importa: ensinar.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: '10x', label: 'Mais rápido' },
              { value: '100%', label: 'Currículo angolano' },
              { value: '0', label: 'Custo inicial' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-accent">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="relative flex w-full flex-col items-center justify-center px-4 py-8 sm:px-8 lg:w-1/2">
        {/* Background effects (mobile) */}
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute -right-20 top-0 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-accent/5 blur-3xl" />
        </div>

        {/* Mobile Logo */}
        <div className="relative mb-8 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <span className="text-sm font-bold text-accent-foreground">P</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Planifica</span>
          </Link>
        </div>

        <div className="relative w-full max-w-sm sm:max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
