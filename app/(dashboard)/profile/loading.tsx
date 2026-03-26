import { StatsSkeleton, Skeleton } from '@/src/ui/components/ui/loading'

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      {/* Profile Card */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 rounded-full sm:h-24 sm:w-24" />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <Skeleton className="mx-auto h-5 w-40 sm:mx-0" />
            <Skeleton className="mx-auto h-4 w-52 sm:mx-0" />
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <StatsSkeleton count={4} />
      {/* Form skeleton */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
