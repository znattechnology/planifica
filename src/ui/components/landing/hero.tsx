"use client"

import { Button } from "@/src/ui/components/ui/button"
import { ArrowRight, Play, Sparkles, CheckCircle2 } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 lg:pt-40 lg:pb-32">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs sm:mb-8 sm:px-4 sm:text-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
            <span className="text-muted-foreground">Alimentado por Inteligência Artificial</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Planeamento inteligente para{" "}
            <span className="bg-gradient-to-r from-accent via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              professores do futuro
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg lg:text-xl">
            A plataforma de IA que transforma horas de planeamento em minutos. Crie planos anuais,
            trimestrais e de aulas automaticamente, e concentre-se no que realmente importa: ensinar.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <Button
              size="lg"
              className="w-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
            >
              Começar grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-border/60 bg-transparent hover:bg-secondary sm:w-auto"
            >
              <Play className="mr-2 h-4 w-4" />
              Ver como funciona
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground sm:mt-12 sm:gap-6 sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
              <span>Configuração em 2 minutos</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent sm:h-4 sm:w-4" />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative mt-12 sm:mt-16 lg:mt-20">
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-accent/20 via-transparent to-accent/20 blur-xl" />
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50 shadow-2xl backdrop-blur-sm">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 border-b border-border/40 bg-secondary/30 px-3 py-2 sm:px-4 sm:py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/60 sm:h-3 sm:w-3" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60 sm:h-3 sm:w-3" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/60 sm:h-3 sm:w-3" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-background/50 px-2 py-1 text-[10px] text-muted-foreground sm:ml-4 sm:px-3 sm:py-1.5 sm:text-xs">
                app.planifica.ao
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                {/* Sidebar - hidden on mobile */}
                <div className="hidden space-y-4 sm:block lg:col-span-1">
                  <div className="rounded-lg bg-secondary/50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent/20" />
                      <div>
                        <div className="h-3 w-24 rounded bg-foreground/20" />
                        <div className="mt-1.5 h-2 w-16 rounded bg-muted-foreground/20" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-8 rounded bg-accent/10" />
                      <div className="h-8 rounded bg-muted/50" />
                      <div className="h-8 rounded bg-muted/50" />
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-28 rounded bg-foreground/20 sm:h-6 sm:w-40" />
                    <div className="h-7 w-24 rounded bg-accent sm:h-8 sm:w-32" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    <div className="rounded-lg border border-border/40 bg-secondary/30 p-3 sm:p-4">
                      <div className="h-2.5 w-12 rounded bg-muted-foreground/30 sm:h-3 sm:w-16" />
                      <div className="mt-1.5 h-5 w-10 rounded bg-foreground/30 sm:mt-2 sm:h-6 sm:w-12" />
                      <div className="mt-1 h-1.5 w-16 rounded bg-accent/40 sm:h-2 sm:w-20" />
                    </div>
                    <div className="rounded-lg border border-border/40 bg-secondary/30 p-3 sm:p-4">
                      <div className="h-2.5 w-12 rounded bg-muted-foreground/30 sm:h-3 sm:w-16" />
                      <div className="mt-1.5 h-5 w-10 rounded bg-foreground/30 sm:mt-2 sm:h-6 sm:w-12" />
                      <div className="mt-1 h-1.5 w-12 rounded bg-accent/40 sm:h-2 sm:w-16" />
                    </div>
                    <div className="col-span-2 rounded-lg border border-border/40 bg-secondary/30 p-3 sm:col-span-1 sm:p-4">
                      <div className="h-2.5 w-12 rounded bg-muted-foreground/30 sm:h-3 sm:w-16" />
                      <div className="mt-1.5 h-5 w-10 rounded bg-foreground/30 sm:mt-2 sm:h-6 sm:w-12" />
                      <div className="mt-1 h-1.5 w-20 rounded bg-accent/40 sm:h-2 sm:w-24" />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/40 bg-secondary/30 p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="h-3.5 w-24 rounded bg-foreground/20 sm:h-4 sm:w-32" />
                      <div className="flex gap-2">
                        <div className="h-5 w-5 rounded bg-muted/50 sm:h-6 sm:w-6" />
                        <div className="h-5 w-5 rounded bg-muted/50 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                    <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-3.5 w-3.5 rounded bg-accent/50 sm:h-4 sm:w-4" />
                        <div className="h-2.5 flex-1 rounded bg-muted/50 sm:h-3" />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-3.5 w-3.5 rounded bg-accent/50 sm:h-4 sm:w-4" />
                        <div className="h-2.5 w-3/4 rounded bg-muted/50 sm:h-3" />
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-3.5 w-3.5 rounded bg-muted/30 sm:h-4 sm:w-4" />
                        <div className="h-2.5 w-2/3 rounded bg-muted/50 sm:h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
