import { cn } from '@/src/shared/lib/utils'
import { Loader2, Sparkles } from 'lucide-react'

interface LoadingProps {
  /** Variante visual */
  variant?: 'spinner' | 'dots' | 'pulse' | 'ai'
  /** Tamanho do loading */
  size?: 'sm' | 'md' | 'lg'
  /** Texto descritivo */
  text?: string
  /** Texto secundário */
  description?: string
  /** Ocupar a página inteira */
  fullPage?: boolean
  /** Classes adicionais */
  className?: string
}

const SIZE_MAP = {
  sm: { icon: 'h-5 w-5', text: 'text-sm', desc: 'text-xs', dot: 'h-1.5 w-1.5', pulse: 'h-8 w-8' },
  md: { icon: 'h-8 w-8', text: 'text-base', desc: 'text-sm', dot: 'h-2 w-2', pulse: 'h-12 w-12' },
  lg: { icon: 'h-12 w-12', text: 'text-lg', desc: 'text-sm', dot: 'h-2.5 w-2.5', pulse: 'h-16 w-16' },
}

export function Loading({
  variant = 'spinner',
  size = 'md',
  text,
  description,
  fullPage = false,
  className,
}: LoadingProps) {
  const s = SIZE_MAP[size]

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      {/* Spinner */}
      {variant === 'spinner' && (
        <Loader2 className={cn(s.icon, 'animate-spin text-accent')} />
      )}

      {/* Dots */}
      {variant === 'dots' && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(s.dot, 'rounded-full bg-accent animate-bounce')}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {/* Pulse */}
      {variant === 'pulse' && (
        <div className="relative flex items-center justify-center">
          <div className={cn(s.pulse, 'rounded-full bg-accent/20 animate-ping absolute')} />
          <div className={cn(s.pulse, 'rounded-full bg-accent/10 flex items-center justify-center')}>
            <div className={cn(
              size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-5 w-5' : 'h-7 w-7',
              'rounded-full bg-accent',
            )} />
          </div>
        </div>
      )}

      {/* AI */}
      {variant === 'ai' && (
        <div className="relative">
          <div className={cn(
            'flex items-center justify-center rounded-full bg-accent/10',
            size === 'sm' ? 'h-12 w-12' : size === 'md' ? 'h-16 w-16' : 'h-20 w-20',
          )}>
            <Sparkles className={cn(s.icon, 'text-accent')} />
          </div>
          <div className={cn(
            'absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent',
            size === 'sm' ? 'h-12 w-12' : size === 'md' ? 'h-16 w-16' : 'h-20 w-20',
          )} style={{ animationDuration: '1.5s' }} />
        </div>
      )}

      {/* Text */}
      {text && <p className={cn(s.text, 'font-medium text-foreground')}>{text}</p>}
      {description && <p className={cn(s.desc, 'text-muted-foreground text-center max-w-xs')}>{description}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

/** Loading inline para botões e campos */
export function LoadingInline({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
  )
}

/** Skeleton para carregamento de conteúdo */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-secondary', className)} />
  )
}

/** Loading de página completa para Next.js loading.tsx */
export function PageLoading({
  text = 'A carregar...',
  variant = 'spinner',
}: {
  text?: string
  variant?: LoadingProps['variant']
}) {
  return (
    <Loading
      variant={variant}
      size="lg"
      text={text}
      fullPage
    />
  )
}

/** Loading de cards/lista */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 flex-1 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Loading de lista/tabela */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border/40 bg-card/50 p-4 sm:p-5">
          <Skeleton className="hidden sm:block h-12 w-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  )
}

/** Loading de stats */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2">
          <Skeleton className="mx-auto h-5 w-5 rounded" />
          <Skeleton className="mx-auto h-7 w-12" />
          <Skeleton className="mx-auto h-3 w-20" />
        </div>
      ))}
    </div>
  )
}
