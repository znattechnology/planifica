'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error:', error)
  }, [error])

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Algo correu mal</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={reset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
        <Button variant="outline" className="w-full border-border/60" asChild>
          <Link href="/login">Voltar ao login</Link>
        </Button>
      </div>
    </div>
  )
}
