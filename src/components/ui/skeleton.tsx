import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Enhanced skeleton components for dashboard
function SyncScoreSkeleton() {
  return (
    <div className="relative w-32 h-32 mx-auto">
      <Skeleton className="w-32 h-32 rounded-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Skeleton className="h-8 w-12 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

function DashboardCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

function CompactCardSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  )
}

function MoodDisplaySkeleton() {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  SyncScoreSkeleton, 
  DashboardCardSkeleton, 
  CompactCardSkeleton,
  MoodDisplaySkeleton 
}


