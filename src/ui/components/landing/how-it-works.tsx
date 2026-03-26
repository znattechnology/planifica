"use client"

import { Upload, Sparkles, Download } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Inserir plano anual",
    description: "Carregue ou crie o seu plano anual com os conteúdos programáticos do ano lectivo.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Gerar automaticamente",
    description: "A IA analisa o seu plano e gera automaticamente planos trimestrais, quinzenais e de aulas.",
  },
  {
    number: "03",
    icon: Download,
    title: "Usar e exportar",
    description: "Personalize se necessário e exporte em PDF, Word ou imprima directamente.",
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative py-16 sm:py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-accent sm:text-sm">
            Como Funciona
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl">
            Três passos simples
          </h2>
          <p className="mt-3 text-pretty text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Comece a poupar tempo em menos de 5 minutos.
          </p>
        </div>

        <div className="relative mt-10 sm:mt-16">
          {/* Connection Line */}
          <div className="absolute left-1/2 top-16 hidden h-0.5 w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          <div className="grid gap-10 sm:gap-8 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                {/* Step Number */}
                <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center sm:mb-6 sm:h-32 sm:w-32">
                  <div className="absolute inset-0 rounded-full bg-accent/10" />
                  <div className="absolute inset-3 rounded-full bg-accent/20 sm:inset-4" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent sm:h-16 sm:w-16">
                    <step.icon className="h-6 w-6 text-accent-foreground sm:h-8 sm:w-8" />
                  </div>
                </div>

                <div className="mb-1.5 text-xs font-medium text-accent sm:mb-2 sm:text-sm">
                  Passo {step.number}
                </div>
                <h3 className="text-lg font-semibold sm:text-xl">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
