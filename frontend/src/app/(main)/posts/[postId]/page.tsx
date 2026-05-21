"use client";

/**
 * posts/[postId]/page.tsx — Single Post & Comments View
 *
 * Stitch layout:
 *   - Back button (ArrowLeft → router.back())
 *   - PostCard with showFullBody=true (no line-clamp)
 *   - CommentSection below
 *
 * Wiring:
 *   - useQuery(['posts', postId]) → getPost(postId)
 *   - Loading: full post card skeleton
 *   - Error/not found: EmptyState
 *   - CommentSection receives postId + postAuthorId
 */

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { getPost } from "@/lib/api";
import { PostCard } from "@/components/features/feed/post-card";
import { CommentSection } from "@/components/features/posts/comment-section";
import { EmptyState, Spinner } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Auth guard
  useEffect(() => {
    if (hasHydrated && !user) router.replace("/login");
  }, [hasHydrated, user, router]);

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["posts", postId],
    queryFn: () => getPost(postId),
    enabled: !!postId,
  });

  if (!hasHydrated) return null;

  return (
    <div className="space-y-4">
      {/* ── Back navigation ────────────────────────────────────── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Back
      </button>

      {/* ── Post ───────────────────────────────────────────────── */}
      {isLoading ? (
        <PostSkeleton />
      ) : isError || !post ? (
        <EmptyState
          icon={MessageSquare}
          title="Post not found"
          description="This post may have been deleted or doesn't exist."
          action={{ label: "Go to Feed", onClick: () => router.push("/feed") }}
        />
      ) : (
        <>
          <PostCard post={post} showFullBody />

          {/* ── Comments ─────────────────────────────────────── */}
          <CommentSection
            postId={postId}
            postAuthorId={post.authorId._id}
          />
        </>
      )}
    </div>
  );
}

// ─── Post skeleton ────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200/50 bg-white p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
        <Skeleton className="h-3 w-4/5 rounded" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
