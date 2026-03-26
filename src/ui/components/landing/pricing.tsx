"use client"

import Link from "next/link"
import { Check, Sparkles, Zap } from "lucide-react"
import { Button } from "@/src/ui/components/ui/button"

const plans = [
  {
    name: "Grátis",
    description: "Ideal para começar a explorar o poder da IA no planeamento.",
    price: "0",
    currency: "Kz",
    period: "para sempre",
    highlight: false,
    cta: "Começar Grátis",
    href: "/register",
    icon: Zap,
    features: [
      "5 planos de aulas por mês",
      "1 dosificação activa",
      "1 relatório trimestral por mês",
      "Exportação para PDF",
      "Histórico dos últimos 30 dias",
      "Suporte por email",
    ],
    limits: [
      "Sem relatórios anuais",
      "Sem exportação Word",
    ],
  },
  {
    name: "Profissional",
    description: "Para professores que querem planear sem limites.",
    price: "4.900",
    currency: "Kz",
    period: "/mês",
    highlight: true,
    cta: "Começar Período Experimental",
    href: "/register",
    icon: Sparkles,
    features: [
      "Planos de aulas ilimitados",
      "Dosificações ilimitadas",
      "Relatórios trimestrais ilimitados",
      "Relatórios anuais completos",
      "Exportação PDF e Word",
      "Histórico completo e permanente",
      "IA com nível de detalhe avançado",
      "Suporte prioritário",
      "14 dias grátis para experimentar",
    ],
    limits: [],
  },
]

export function Pricing() {
  return (
    <section id="precos" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-accent sm:text-sm">
            Preços
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl">
            Simples e transparente
          </h2>
          <p className="mt-3 text-pretty text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Comece gratuitamente e faça upgrade quando precisar de mais. Sem surpresas, sem contratos.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:mt-16 sm:grid-cols-2 sm:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all sm:p-8 ${
                plan.highlight
                  ? "border-accent/40 bg-card/50 ring-1 ring-accent/20"
                  : "border-border/40 bg-card/30"
              }`}
            >
              {/* Popular badge */}
              {plan.highlight && (
                <div className="absolute right-4 top-4 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent sm:right-6 sm:top-6">
                  Mais popular
                </div>
              )}

              {/* Background effect for highlighted */}
              {plan.highlight && (
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />
              )}

              {/* Icon & Name */}
              <div className="relative">
                <div
                  className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl sm:mb-4 sm:h-12 sm:w-12 ${
                    plan.highlight ? "bg-accent/10" : "bg-secondary"
                  }`}
                >
                  <plan.icon
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${
                      plan.highlight ? "text-accent" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <h3 className="text-lg font-semibold sm:text-xl">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="relative mt-5 sm:mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {plan.price}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {plan.currency}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.period}</p>
              </div>

              {/* CTA */}
              <div className="relative mt-6 sm:mt-8">
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  }`}
                  size="lg"
                  asChild
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>

              {/* Features */}
              <div className="relative mt-6 flex-1 sm:mt-8">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  O que inclui
                </p>
                <ul className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limits */}
                {plan.limits.length > 0 && (
                  <ul className="mt-3 space-y-2.5 border-t border-border/30 pt-3 sm:mt-4 sm:pt-4">
                    {plan.limits.map((limit) => (
                      <li key={limit} className="flex items-start gap-2.5">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                        <span className="text-sm text-muted-foreground/60">{limit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className="mx-auto mt-8 max-w-2xl text-center sm:mt-12">
          <p className="text-sm text-muted-foreground">
            Todos os preços em Kwanzas (Kz). O plano Profissional inclui 14 dias de período experimental gratuito.
            Cancele a qualquer momento, sem compromisso.
          </p>
        </div>
      </div>
    </section>
  )
}
