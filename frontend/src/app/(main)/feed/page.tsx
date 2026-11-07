"use client";

/**
 * feed/page.tsx — Main Feed
 *
 * Stitch layout: Two-column desktop (center feed + right suggestions panel)
 *   Center: CreatePostTrigger → Sort divider → post list → infinite scroll
 *   Right (lg+): "Add to your feed" panel + footer links
 *
 * Refinements applied (May 2026):
 *   - space-y-6 card gap (was space-y-4) — matches Stitch 24px gap
 *   - Sort divider between trigger and feed
 *   - Right sidebar Follow buttons match Stitch secondary border style
 *   - Footer links expanded to match Stitch
 *   - Infinite scroll IntersectionObserver rootMargin 200px
 *   - "You're all caught up" end-of-feed indicator
 *   - Auth guard via Zustand (_hasHydrated)
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, Rss, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useFeed } from "@/hooks/use-feed";
import { PostCard } from "@/components/features/feed/post-card";
import { CreatePostTrigger } from "@/components/features/feed/create-post-trigger";
import { FeedSkeleton } from "@/components/features/feed/feed-skeleton";
import { EmptyState, Spinner, Avatar } from "@/components/shared";
import type { FeedPost } from "@/types";

// ─── Static suggestion data (right panel) ────────────────────────────────────

const SUGGESTIONS = [
  { id: "1", name: "Marcus Vance",    role: "Partner at VentureCap Partners" },
  { id: "2", name: "Elena Rodriguez", role: "Senior Data Scientist"           },
  { id: "3", name: "James Park",      role: "CTO at Nexus Ventures"           },
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
      {/* ── Center column ──────────────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">

        {/* Create post trigger */}
        <CreatePostTrigger />

        {/* Sort divider — matches Stitch "Sort by: Top" pattern */}
        {!isLoading && !isEmpty && (
          <div className="flex items-center gap-3 px-0.5">
            <hr className="flex-1 border-slate-200/70" />
            <span className="shrink-0 text-xs text-slate-400">
              Sort by:{" "}
              <strong className="cursor-pointer font-semibold text-slate-700 hover:text-indigo-600 transition-colors">
                Top
              </strong>
            </span>
          </div>
        )}

        {/* Feed content */}
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
            {/* Posts — space-y-6 matches Stitch 24px gap between cards */}
            <div className="space-y-6">
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

            {/* End of feed */}
            {!hasNextPage && posts.length > 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                You&apos;re all caught up ·{" "}
                <button
                  onClick={() => router.push("/connections")}
                  className="font-medium text-indigo-600 hover:underline hover:underline-offset-2"
                >
                  Find more connections
                </button>
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Right suggestions panel (lg+) ───────────────────── */}
      <aside className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-24 space-y-4">

          {/* Suggestions card */}
          <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Add to your feed
            </h3>

            <div className="flex flex-col gap-4">
              {SUGGESTIONS.map((s) => (
                <div key={s.id} className="flex items-start gap-3">
                  <Avatar name={s.name} seed={s.id} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {s.name}
                    </p>
                    <p className="truncate text-xs text-slate-400 line-clamp-1">
                      {s.role}
                    </p>
                    {/* Stitch style: rounded-full border border-secondary text-secondary */}
                    <button className="mt-2 flex items-center gap-1 rounded-full border border-indigo-400 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Users size={11} strokeWidth={2} />
                      Follow
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* View all — matches Stitch arrow_forward pattern */}
            <a
              href="/connections"
              className="mt-5 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              View all recommendations
              <ArrowRight size={12} strokeWidth={2} />
            </a>
          </div>

          {/* Footer links — matches Stitch footer in sidebar context */}
          <div className="px-1 text-[11px] leading-relaxed text-slate-400">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {[
                "Privacy Policy",
                "User Agreement",
                "Cookie Policy",
                "Brand Policy",
                "Community Guidelines",
              ].map((link) => (
                <a key={link} href="#" className="hover:text-slate-600 transition-colors">
                  {link}
                </a>
              ))}
            </div>
            <p className="mt-2">
              <span className="font-medium text-slate-500">LinkUp</span>{" "}
              © 2024
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
