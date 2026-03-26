import Link from 'next/link'
import { ArrowLeft, Home, Search } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="relative mx-auto max-w-lg text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

        {/* 404 number */}
        <div className="relative">
          <span className="text-[120px] font-bold leading-none tracking-tighter text-accent/10 sm:text-[160px]">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/40 bg-card/50 backdrop-blur-sm">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Text */}
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          A página que procura não existe ou foi movida. Verifique o endereço ou volte à página
          inicial.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
            asChild
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Página Inicial
            </Link>
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
        </div>

        {/* Help */}
        <p className="mt-8 text-xs text-muted-foreground">
          Precisa de ajuda?{' '}
          <Link href="#" className="font-medium text-accent hover:underline">
            Contacte o suporte
          </Link>
        </p>
      </div>
    </div>
  )
}
