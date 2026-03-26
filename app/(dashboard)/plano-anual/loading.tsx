import { CardSkeleton, StatsSkeleton } from '@/src/ui/components/ui/loading'
import { Skeleton } from '@/src/ui/components/ui/loading'

export default function PlanoAnualLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <CardSkeleton count={3} />
    </div>
  )
}
