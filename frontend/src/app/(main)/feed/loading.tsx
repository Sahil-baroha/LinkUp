import { FeedSkeleton } from "@/components/features/feed/feed-skeleton";

/**
 * loading.tsx — Feed page loading state
 *
 * Next.js displays this automatically while feed/page.tsx is loading.
 * Server Component — no 'use client' directive needed.
 */
export default function FeedLoading() {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <FeedSkeleton />
      </div>
      {/* Right panel placeholder */}
      <div className="hidden lg:block w-72 shrink-0">
        <div className="h-64 rounded-xl border border-slate-200/50 bg-white/50" />
      </div>
    </div>
  );
}
