import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/src/ui/components/ui/button'
import { ROUTES } from '@/src/shared/constants/routes.constants'

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* 404 visual */}
      <div className="relative">
        <span className="text-[100px] font-bold leading-none tracking-tighter text-accent/10 sm:text-[140px]">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/40 bg-card/50">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
        </div>
      </div>

      <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
        Página não encontrada
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        A página que procura não existe ou foi movida. Verifique o endereço ou volte ao dashboard.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <Link href={ROUTES.DASHBOARD}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
