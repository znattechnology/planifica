"use client"

import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/src/ui/components/ui/button"

export function CTA() {
  return (
    <section className="relative py-16 sm:py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 px-4 py-12 backdrop-blur-sm sm:rounded-3xl sm:px-12 sm:py-16 lg:px-20 lg:py-24">
          {/* Background Effects */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent sm:mb-6 sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Comece hoje mesmo
            </div>

            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
              Pronto para transformar o seu planeamento?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Junte-se a centenas de professores que já poupam horas todas as semanas com o Planifica.
              Comece gratuitamente, sem cartão de crédito.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <Button
                size="lg"
                className="w-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
              >
                Começar grátis agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-border/60 bg-transparent hover:bg-secondary sm:w-auto"
              >
                Falar com a equipa
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground sm:mt-6 sm:text-sm">
              Configuração em 2 minutos. Cancele quando quiser.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
