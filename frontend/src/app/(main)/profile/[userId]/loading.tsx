/**
 * profile loading skeleton
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Profile banner & header card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <Skeleton className="h-36 w-full" />
        <div className="p-6 pt-0 relative">
          <div className="-mt-12 mb-4">
            <Skeleton className="h-24 w-24 rounded-full border-4 border-white shadow-sm" />
          </div>
          <div className="space-y-2.5 max-w-md">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
            <Skeleton className="h-3.5 w-36 rounded-md" />
          </div>
        </div>
      </div>

      {/* About card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-3">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-4/5 rounded" />
        <Skeleton className="h-3.5 w-2/3 rounded" />
      </div>

      {/* Experience / Education cards */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <Skeleton className="h-5 w-32 rounded-md" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
