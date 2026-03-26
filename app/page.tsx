import { Navbar } from '@/src/ui/components/landing/navbar'
import { Hero } from '@/src/ui/components/landing/hero'
import { Problem } from '@/src/ui/components/landing/problem'
import { Solution } from '@/src/ui/components/landing/solution'
import { Features } from '@/src/ui/components/landing/features'
import { HowItWorks } from '@/src/ui/components/landing/how-it-works'
import { AIHighlight } from '@/src/ui/components/landing/ai-highlight'
import { Pricing } from '@/src/ui/components/landing/pricing'
import { Testimonials } from '@/src/ui/components/landing/testimonials'
import { CTA } from '@/src/ui/components/landing/cta'
import { Footer } from '@/src/ui/components/landing/footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative min-h-screen bg-background">
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <HowItWorks />
        <AIHighlight />
        <Pricing />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
