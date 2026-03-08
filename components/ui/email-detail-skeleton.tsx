import { Skeleton } from "./skeleton";

export function EmailDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9" />
              <div>
                <Skeleton className="h-6 w-48 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="bg-card rounded-lg border border-border p-6">
          {/* Email Header Skeleton */}
          <div className="mb-6 pb-6 border-b border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Skeleton className="h-6 w-full mb-2" />
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>

          {/* Email Body Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </main>
    </div>
  );
}
