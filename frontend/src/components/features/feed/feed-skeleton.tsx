/**
 * feed-skeleton.tsx — Three skeleton post cards for initial feed loading
 *
 * Server Component — no interactivity, no 'use client' needed.
 * Mimics PostCard structure: avatar row + body lines + action bar.
 * Used while useInfiniteQuery isLoading on first render.
 */

import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-100",
        className
      )}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200/50 bg-white p-6">
      {/* Header: avatar + name lines */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Body lines */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>

      {/* Action bar */}
      <div className="flex gap-3 border-t border-slate-100 pt-3">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
