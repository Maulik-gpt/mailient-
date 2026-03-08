import { Skeleton } from "./skeleton";

export function EmailSkeleton() {
  return (
    <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 shadow-lg overflow-hidden">
      {/* Subtle water effect background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />

      <div className="relative flex items-start gap-4">
        {/* Premium Star Icon Skeleton */}
        <div className="relative">
          <Skeleton className="h-6 w-6 mt-0.5 rounded-full" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 animate-pulse" />
        </div>

        <div className="flex-1 space-y-3">
          {/* Sender and Time Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Premium Avatar Skeleton */}
              <div className="relative">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 animate-pulse" />
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-400/60 animate-ping" />
              </div>

              {/* Premium Sender Name Skeleton */}
              <div className="space-y-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>

            {/* Premium Time Skeleton */}
            <div className="text-right space-y-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Premium Subject Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>

          {/* Premium Preview Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Premium badge skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
        </div>
      </div>

      {/* Animated border effect */}
      <div className="absolute inset-0 rounded-2xl border border-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse opacity-50" />
    </div>
  );
}
