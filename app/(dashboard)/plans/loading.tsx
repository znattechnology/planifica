import { ListSkeleton, StatsSkeleton, Skeleton } from '@/src/ui/components/ui/loading'

export default function PlansLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40 rounded-md" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-full sm:w-40 rounded-md" />
      </div>
      <StatsSkeleton count={4} />
      <ListSkeleton count={3} />
    </div>
  )
}
