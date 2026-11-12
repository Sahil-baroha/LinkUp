"use client";

/**
 * feed/page.tsx — Main Feed
 *
 * Requirements:
 *   - Real suggestions via useSuggestions(5)
 *   - Suggestion row: UserAvatar, name, headline, mutual connections, Connect button (useSendRequest -> disabled "Pending")
 *   - Loading: 3 skeleton rows; hide card when empty or on error
 *   - Remove all fake data, Follow buttons, "#" links
 *   - First-run empty state: message, "Find people" button to /connections, hint to start a post
 *   - Footer: computed year
 *   - Infinite scroll preserved
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rss, ArrowRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useFeed } from "@/hooks/use-feed";
import { useSuggestions } from "@/hooks/use-user";
import { useSendRequest } from "@/hooks/use-connections";
import { PostCard } from "@/components/features/feed/post-card";
import { CreatePostTrigger } from "@/components/features/feed/create-post-trigger";
import { FeedSkeleton } from "@/components/features/feed/feed-skeleton";
import { EmptyState, Spinner, UserAvatar } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedPost, SuggestionUser } from "@/types";

// ─── Suggestion row ──────────────────────────────────────────────────────────

function SuggestionItem({ user }: { user: SuggestionUser }) {
  const [sent, setSent] = useState(false);
  const sendMutation = useSendRequest();

  function handleConnect() {
    sendMutation.mutate(user._id, {
      onSuccess: () => {
        setSent(true);
      },
      onError: (err: unknown) => {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to send connection request";
        toast.error(message);
      },
    });
  }

  const displayName = user.name || user.username;

  return (
    <div className="flex items-start gap-3">
      <Link href={`/profile/${user._id}`} className="shrink-0">
        <UserAvatar
          src={user.profilePicture}
          name={displayName}
          seed={user._id}
          size="md"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${user._id}`}
          className="block truncate text-sm font-semibold text-slate-900 hover:underline hover:underline-offset-2 transition-colors"
        >
          {displayName}
        </Link>
        {user.headline && (
          <p className="truncate text-xs text-slate-500">{user.headline}</p>
        )}
        {user.mutualCount > 0 && (
          <p className="text-[11px] text-slate-400">
            {user.mutualCount} mutual connection{user.mutualCount > 1 ? "s" : ""}
          </p>
        )}
        <button
          type="button"
          onClick={handleConnect}
          disabled={sent || sendMutation.isPending}
          className="mt-2 flex items-center gap-1 rounded-full border border-indigo-400 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <UserPlus size={11} strokeWidth={2} />
          {sent ? "Pending" : sendMutation.isPending ? "Connecting..." : "Connect"}
        </button>
      </div>
    </div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────

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

  const {
    data: suggestions,
    isLoading: suggestionsLoading,
    isError: suggestionsError,
  } = useSuggestions(5);

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

        {/* Sort divider */}
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
            description="Connect with people to see their posts here, or share your thoughts with a new post above."
            action={{
              label: "Find people",
              onClick: () => router.push("/connections"),
            }}
          />
        ) : (
          <>
            {/* Posts */}
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
                  type="button"
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
          {suggestionsLoading ? (
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Add to your feed
              </h3>
              <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !suggestionsError && suggestions && suggestions.length > 0 ? (
            <div className="rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Add to your feed
              </h3>

              <div className="flex flex-col gap-4">
                {suggestions.map((s) => (
                  <SuggestionItem key={s._id} user={s} />
                ))}
              </div>

              <Link
                href="/connections"
                className="mt-5 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                View all recommendations
                <ArrowRight size={12} strokeWidth={2} />
              </Link>
            </div>
          ) : null}

          {/* Footer */}
          <div className="px-1 text-[11px] leading-relaxed text-slate-400">
            <p className="mt-2">
              <span className="font-medium text-slate-500">LinkUp</span> ©{" "}
              {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
