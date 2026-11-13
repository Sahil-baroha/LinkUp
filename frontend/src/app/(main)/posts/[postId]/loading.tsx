/**
 * posts loading skeleton
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function PostLoading() {
  return (
    <div className="space-y-4">
      {/* Back button skeleton */}
      <Skeleton className="h-5 w-28 rounded-md" />

      {/* PostCard skeleton */}
      <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-3/4 rounded" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      {/* Comment section skeleton */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <Skeleton className="h-5 w-28 rounded-md" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
