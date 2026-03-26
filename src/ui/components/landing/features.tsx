"use client"

import {
  Sparkles,
  Calendar,
  FileText,
  BarChart3,
  History,
  Zap,
} from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Geração automática de planos",
    description: "IA avançada que cria planos de aulas completos em segundos, adaptados ao seu currículo.",
  },
  {
    icon: Calendar,
    title: "Gestão de dosificação anual",
    description: "Organize todo o ano lectivo de forma visual e intuitiva, com distribuição automática de conteúdos.",
  },
  {
    icon: FileText,
    title: "Relatórios trimestrais automáticos",
    description: "Gere relatórios profissionais com análise de progresso e estatísticas detalhadas.",
  },
  {
    icon: BarChart3,
    title: "Relatórios anuais inteligentes",
    description: "Consolidação automática de dados anuais com insights e recomendações baseadas em IA.",
  },
  {
    icon: History,
    title: "Histórico e organização",
    description: "Aceda a todos os seus planos e relatórios anteriores, sempre pesquisáveis.",
  },
  {
    icon: Zap,
    title: "Interface simples e rápida",
    description: "Design intuitivo que qualquer professor pode dominar em minutos, sem formação técnica.",
  },
]

export function Features() {
  return (
    <section id="funcionalidades" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-accent sm:text-sm">
            Funcionalidades
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl">
            Tudo o que precisa, num só lugar
          </h2>
          <p className="mt-3 text-pretty text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Ferramentas poderosas concebidas especificamente para as necessidades dos professores angolanos.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/30 p-5 transition-all hover:border-accent/40 hover:bg-card/50 sm:p-6"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/5 transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 sm:mb-4 sm:h-12 sm:w-12">
                  <feature.icon className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
                </div>
                <h3 className="text-base font-semibold sm:text-lg">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
