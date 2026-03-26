"use client"

import { Clock, FileStack, RefreshCw } from "lucide-react"

const problems = [
  {
    icon: Clock,
    title: "Horas de planeamento",
    description: "Professores gastam em média 8-12 horas por semana apenas a planear aulas e criar documentos.",
  },
  {
    icon: FileStack,
    title: "Documentação repetitiva",
    description: "Criar planos anuais, trimestrais e de aulas manualmente consome tempo que deveria ser para ensinar.",
  },
  {
    icon: RefreshCw,
    title: "Relatórios manuais",
    description: "Compilar relatórios trimestrais e anuais é um processo tedioso e propenso a erros.",
  },
]

export function Problem() {
  return (
    <section className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-accent sm:text-sm">
            O Problema
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl">
            O tempo é o recurso mais valioso de um professor
          </h2>
          <p className="mt-3 text-pretty text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Sabemos como é frustrante passar mais tempo a criar documentos do que a ensinar.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 md:gap-8">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-border/40 bg-card/30 p-5 transition-all hover:border-border/80 hover:bg-card/50 sm:p-6 lg:p-8"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 sm:mb-6 sm:h-12 sm:w-12">
                <problem.icon className="h-5 w-5 text-destructive sm:h-6 sm:w-6" />
              </div>
              <h3 className="text-lg font-semibold sm:text-xl">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
