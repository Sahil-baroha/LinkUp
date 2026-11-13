"use client";

/**
 * posts/[postId]/page.tsx — Single Post & Comments View
 *
 * Requirements:
 *   - Back link (to /feed)
 *   - PostCard with showFullBody=true on top
 *   - CommentSection below
 *   - Skeleton loading state
 *   - EmptyState for 404 / deleted post
 *   - Synchronized comment counts via query invalidation
 */

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { usePost } from "@/hooks/use-posts";
import { PostCard } from "@/components/features/feed/post-card";
import { CommentSection } from "@/components/features/posts/comment-section";
import { EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const { data: post, isLoading, isError } = usePost(postId);

  if (!hasHydrated) return null;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          <span>Back to feed</span>
        </Link>
      </div>

      {/* Main post view */}
      {isLoading ? (
        <PostSkeleton />
      ) : isError || !post ? (
        <EmptyState
          icon={MessageSquare}
          title="Post not found"
          description="This post may have been deleted or does not exist."
          action={{ label: "Go to feed", onClick: () => router.push("/feed") }}
        />
      ) : (
        <>
          <PostCard post={post} showFullBody />

          {/* Comments section */}
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
  );
}
