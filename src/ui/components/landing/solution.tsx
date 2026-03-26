"use client"

import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/src/ui/components/ui/button"

export function Solution() {
  return (
    <section className="relative py-16 sm:py-24 lg:py-32">
      {/* Background Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent sm:text-sm">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              A Solução
            </div>
            <h2 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:mt-6 sm:text-3xl md:text-4xl lg:text-5xl">
              Planeamento automático com{" "}
              <span className="text-accent">inteligência artificial</span>
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
              O Planifica usa IA avançada para transformar a forma como os professores planeiam.
              Insira o seu plano anual uma única vez e deixe a nossa tecnologia gerar automaticamente
              todos os documentos que precisa: planos trimestrais, quinzenais, de aulas e relatórios.
            </p>

            <ul className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
              {[
                "Geração automática de planos em segundos",
                "Relatórios inteligentes com análise de progresso",
                "Adaptação ao currículo nacional angolano",
                "Exportação para Word, PDF ou impressão directa",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 sm:h-6 sm:w-6">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent sm:h-2 sm:w-2" />
                  </div>
                  <span className="text-sm text-muted-foreground sm:text-base">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 sm:mt-10">
              <Button className="w-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto">
                Experimentar agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-accent/20 via-transparent to-accent/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
              {/* AI Processing Visual */}
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-accent/20 sm:h-16 sm:w-16 sm:rounded-2xl" />
                    <div className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent sm:h-6 sm:w-6">
                      <Zap className="h-2.5 w-2.5 text-accent-foreground sm:h-3 sm:w-3" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Planifica AI</div>
                    <div className="text-xs text-muted-foreground sm:text-sm">A processar plano anual...</div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Análise do currículo</span>
                    <span className="text-accent">Completo</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary sm:h-2">
                    <div className="h-full w-full rounded-full bg-accent" />
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Geração de planos trimestrais</span>
                    <span className="text-accent">Completo</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary sm:h-2">
                    <div className="h-full w-full rounded-full bg-accent" />
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Planos de aulas</span>
                    <span className="text-foreground">A gerar...</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary sm:h-2">
                    <div className="h-full w-3/4 rounded-full bg-accent animate-pulse" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
                  {["1º Trim.", "2º Trim.", "3º Trim."].map((trim, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-accent/30 bg-accent/10 p-2 text-center sm:p-3"
                    >
                      <div className="text-[10px] text-muted-foreground sm:text-xs">{trim}</div>
                      <div className="mt-0.5 text-base font-semibold text-accent sm:mt-1 sm:text-lg">
                        {12 + i * 4} aulas
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
