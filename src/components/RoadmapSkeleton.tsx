import { Skeleton } from '@/components/ui/Skeleton'

export function RoadmapSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Profile skeleton */}
      <div className="rounded-md border border-border bg-surface p-5">
        <div className="flex items-start gap-5">
          <Skeleton className="w-16 h-16 rounded-md" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-16" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Skills skeleton */}
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border bg-surface p-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-sm" />
              </div>
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline skeleton */}
      <div>
        <Skeleton className="h-6 w-56 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 pb-8">
            <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
            <div className="flex-1 rounded-md border border-border bg-surface p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
