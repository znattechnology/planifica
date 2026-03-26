import { cn } from '@/src/shared/lib/utils'

interface FormErrorProps {
  message?: string
  className?: string
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null

  return (
    <p className={cn('text-xs text-destructive mt-1', className)}>
      {message}
    </p>
  )
}

interface FormAlertProps {
  message: string
  variant?: 'error' | 'success'
  className?: string
}

export function FormAlert({ message, variant = 'error', className }: FormAlertProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        variant === 'error'
          ? 'border-destructive/20 bg-destructive/5 text-destructive'
          : 'border-accent/20 bg-accent/5 text-accent',
        className,
      )}
    >
      {message}
    </div>
  )
}
