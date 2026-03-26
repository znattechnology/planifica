'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Home, RotateCcw } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="relative mx-auto max-w-lg text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-destructive/10 blur-3xl" />

        {/* Icon */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>

        {/* Text */}
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
          Algo correu mal
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Ocorreu um erro inesperado. A nossa equipa foi notificada e estamos a trabalhar na
          resolução.
        </p>

        {/* Error digest */}
        {error.digest && (
          <div className="mt-4 inline-flex items-center rounded-lg border border-border/40 bg-card/50 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">
              Código: <code className="font-mono text-foreground">{error.digest}</code>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
            onClick={reset}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
          <Button
            variant="outline"
            className="w-full border-border/60 sm:w-auto"
            asChild
          >
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full border-border/60 sm:w-auto"
            asChild
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Página Inicial
            </Link>
          </Button>
        </div>

        {/* Help */}
        <p className="mt-8 text-xs text-muted-foreground">
          Se o problema persistir,{' '}
          <Link href="#" className="font-medium text-accent hover:underline">
            contacte o suporte
          </Link>
        </p>
      </div>
    </div>
  )
}
