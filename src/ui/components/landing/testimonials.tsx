"use client"

import { Star } from "lucide-react"

const testimonials = [
  {
    quote: "O Planifica transformou a minha rotina. Antes gastava domingos inteiros a planear, agora faço tudo numa hora.",
    author: "Maria João",
    role: "Professora de Matemática",
    school: "Escola Primária Nº 1234, Luanda",
    rating: 5,
  },
  {
    quote: "Finalmente uma ferramenta feita para professores angolanos! Os relatórios são exactamente o que o Ministério pede.",
    author: "António Carlos",
    role: "Professor de Português",
    school: "Colégio Internacional de Benguela",
    rating: 5,
  },
  {
    quote: "A geração automática de planos de aula é incrível. A IA entende perfeitamente o currículo nacional.",
    author: "Teresa Manuel",
    role: "Coordenadora Pedagógica",
    school: "Instituto Médio de Huambo",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section id="testemunhos" className="relative py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-accent sm:text-sm">
            Testemunhos
          </p>
          <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl md:text-4xl lg:text-5xl">
            Professores que já transformaram o seu trabalho
          </h2>
          <p className="mt-3 text-pretty text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Veja o que outros educadores dizem sobre o Planifica.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-border/40 bg-card/30 p-5 sm:p-6 lg:p-8"
            >
              {/* Rating */}
              <div className="mb-3 flex gap-1 sm:mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent sm:h-5 sm:w-5" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-pretty text-sm leading-relaxed text-foreground/90 sm:text-base">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="mt-4 flex items-center gap-3 sm:mt-6 sm:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 sm:h-12 sm:w-12">
                  <span className="text-base font-semibold text-accent sm:text-lg">
                    {testimonial.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold sm:text-base">{testimonial.author}</div>
                  <div className="text-xs text-muted-foreground sm:text-sm">{testimonial.role}</div>
                  <div className="text-[10px] text-muted-foreground/70 sm:text-xs">{testimonial.school}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
