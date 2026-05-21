"use client";

/**
 * feed/page.tsx — Main Feed
 *
 * Stitch layout: Two-column desktop (center feed + right suggestions panel)
 *   Center: CreatePostTrigger → post list → infinite scroll sentinel
 *   Right (lg+): Static "Add to your feed" suggestions panel
 *
 * Wiring:
 *   - useFeed() → infinite scroll via IntersectionObserver
 *   - Loading (first page): FeedSkeleton
 *   - Loading (next page): Spinner below last post
 *   - Empty: EmptyState with "Find Connections" CTA
 *   - Auth guard via Zustand (middleware also guards)
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Rss } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useFeed } from "@/hooks/use-feed";
import { PostCard } from "@/components/features/feed/post-card";
import { CreatePostTrigger } from "@/components/features/feed/create-post-trigger";
import { FeedSkeleton } from "@/components/features/feed/feed-skeleton";
import { EmptyState, Spinner, Avatar } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/types";

// ─── Static suggestion data (right panel) ────────────────────────────────────

const SUGGESTIONS = [
  { id: "1", name: "Marcus Vance",     role: "Partner at VentureCap Partners" },
  { id: "2", name: "Elena Rodriguez",  role: "Senior Data Scientist"           },
  { id: "3", name: "James Park",       role: "CTO at Nexus Ventures"           },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFeed();

  // Auth guard
  useEffect(() => {
    if (hasHydrated && !user) router.replace("/login");
  }, [hasHydrated, user, router]);

  // IntersectionObserver sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isEmpty = !isLoading && posts.length === 0 && !hasNextPage;

  if (!hasHydrated) return null;

  return (
    <div className="flex gap-6">
      {/* ── Center column ──────────────────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Create post trigger */}
        <CreatePostTrigger />

        {/* Posts */}
        {isLoading ? (
          <FeedSkeleton />
        ) : isEmpty ? (
          <EmptyState
            icon={Rss}
            title="Your feed is empty"
            description="Connect with people to see their posts here."
            action={{
              label: "Find Connections",
              onClick: () => router.push("/connections"),
            }}
          />
        ) : (
          <>
            <div className="space-y-4">
              {posts.map((post: FeedPost) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Next-page spinner */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Spinner size="md" />
              </div>
            )}

            {/* End of feed indicator */}
            {!hasNextPage && posts.length > 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                You&apos;re all caught up
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Right suggestions panel (lg+) ─────────────────────── */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 space-y-4">
          {/* Suggestions card */}
          <div className="rounded-xl border border-slate-200/50 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Add to your feed
              </h3>
            </div>

            <div className="space-y-4">
              {SUGGESTIONS.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <Avatar name={s.name} seed={s.id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {s.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">{s.role}</p>
                  </div>
                  <button className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>

            <button className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline">
              <Users size={13} />
              View all recommendations
            </button>
          </div>

          {/* Footer links */}
          <p className="px-1 text-[11px] leading-relaxed text-slate-400">
            <span className="font-medium text-slate-500">LinkUp</span> ·{" "}
            <a href="#" className={cn("hover:underline")}>Privacy</a> ·{" "}
            <a href="#" className="hover:underline">Terms</a> ·{" "}
            <a href="#" className="hover:underline">Cookies</a>
          </p>
        </div>
      </aside>
    </div>
  );
}
