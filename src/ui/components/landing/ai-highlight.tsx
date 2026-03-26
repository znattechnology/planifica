"use client"

import { Bot, Brain, Cpu, Lightbulb } from "lucide-react"

export function AIHighlight() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24 lg:py-32">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="absolute -left-40 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Visual */}
          <div className="relative order-2 lg:order-1">
            <div className="relative mx-auto aspect-square max-w-[280px] sm:max-w-sm md:max-w-md">
              {/* Outer Ring */}
              <div className="absolute inset-0 animate-pulse rounded-full border border-accent/20" />
              <div className="absolute inset-4 rounded-full border border-accent/30 sm:inset-8" />
              <div className="absolute inset-8 rounded-full border border-accent/40 sm:inset-16" />

              {/* Center */}
              <div className="absolute inset-14 flex items-center justify-center rounded-full bg-accent/20 backdrop-blur-sm sm:inset-24">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent sm:h-24 sm:w-24">
                  <Brain className="h-8 w-8 text-accent-foreground sm:h-12 sm:w-12" />
                </div>
              </div>

              {/* Floating Icons */}
              <div className="absolute left-0 top-1/4 flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-card/80 backdrop-blur-sm sm:left-4 sm:h-14 sm:w-14 sm:rounded-xl">
                <Bot className="h-5 w-5 text-accent sm:h-7 sm:w-7" />
              </div>
              <div className="absolute right-0 top-1/3 flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-card/80 backdrop-blur-sm sm:right-4 sm:h-14 sm:w-14 sm:rounded-xl">
                <Cpu className="h-5 w-5 text-accent sm:h-7 sm:w-7" />
              </div>
              <div className="absolute bottom-1/4 left-2 flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-card/80 backdrop-blur-sm sm:left-8 sm:h-14 sm:w-14 sm:rounded-xl">
                <Lightbulb className="h-5 w-5 text-accent sm:h-7 sm:w-7" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent sm:text-sm">
              <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Inteligência Artificial
            </div>
            <h2 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:mt-6 sm:text-3xl md:text-4xl lg:text-5xl">
              O seu assistente pedagógico com IA
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              O Planifica não é apenas ferramenta de planeamento. É um assistente inteligente
              que aprende com os seus padrões e melhora continuamente as suas sugestões.
            </p>

            <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-10 sm:w-10">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent sm:h-3 sm:w-3" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold sm:text-base">Aprendizagem Contínua</h3>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    A IA aprende com as suas preferências e melhora as sugestões ao longo do tempo.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-10 sm:w-10">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent sm:h-3 sm:w-3" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold sm:text-base">Adaptado ao Currículo Angolano</h3>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Treinada especificamente com o currículo nacional para máxima relevância.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 sm:h-10 sm:w-10">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent sm:h-3 sm:w-3" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold sm:text-base">Automação Inteligente</h3>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Automatiza tarefas repetitivas mantendo a qualidade pedagógica.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
