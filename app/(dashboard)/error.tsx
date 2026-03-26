'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { ROUTES } from '@/src/shared/constants/routes.constants'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <h1 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
        Algo correu mal
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Ocorreu um erro inesperado. Tente novamente ou volte ao dashboard.
      </p>

      {error.digest && (
        <div className="mt-3 inline-flex items-center rounded-lg border border-border/40 bg-card/50 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            Código: <code className="font-mono text-foreground">{error.digest}</code>
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={reset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
        <Button variant="outline" className="border-border/60" asChild>
          <Link href={ROUTES.DASHBOARD}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
