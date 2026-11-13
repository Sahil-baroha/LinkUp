"use client";

/**
 * comment-section.tsx — Post comments with composer, list, and pagination
 *
 * Props: postId, postAuthorId
 *
 * Features:
 *   - Header with total count
 *   - Composer: UserAvatar, Textarea with live character counter (1000 max),
 *     disabled when empty or over cap, optimistic add
 *   - CommentItem list rows
 *   - Page-based "Load more comments" button with spinner
 *   - EmptyState when no comments exist
 */

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useComments, useAddComment } from "@/hooks/use-comments";
import { UserAvatar, Spinner, EmptyState } from "@/components/shared";
import { Textarea } from "@/components/ui/textarea";
import { CommentItem } from "./comment-item";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
}

const MAX_COMMENT_LENGTH = 1000;

export function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const user = useAuthStore((s) => s.user);
  const [body, setBody] = useState("");

  const {
    comments,
    total,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useComments(postId);

  const addMutation = useAddComment(postId);

  const isOverCap = body.length > MAX_COMMENT_LENGTH;
  const isPostDisabled = !body.trim() || isOverCap || addMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || isOverCap || addMutation.isPending) return;

    addMutation.mutate(trimmed, {
      onSuccess: () => {
        setBody("");
        toast.success("Comment added");
      },
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to add comment";
        toast.error(message);
      },
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">
          Comments
          {total > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({total})
            </span>
          )}
        </h2>
      </div>

      {/* Composer */}
      {user && (
        <form onSubmit={handleSubmit} className="mt-4 flex items-start gap-3">
          <UserAvatar
            src={user.profilePicture}
            name={user.name || user.username}
            size="sm"
            seed={user._id}
            className="mt-1 shrink-0"
          />
          <div className="flex-1 space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[72px] resize-none text-sm bg-slate-50 focus:bg-white"
              maxLength={MAX_COMMENT_LENGTH + 50}
              disabled={addMutation.isPending}
            />
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs",
                  isOverCap ? "text-red-500 font-medium" : "text-slate-400"
                )}
              >
                {body.length}/{MAX_COMMENT_LENGTH}
              </span>
              <button
                type="submit"
                disabled={isPostDisabled}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {addMutation.isPending && <Spinner size="sm" />}
                Post
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Comment List */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No comments yet"
            description="Be the first to share your thoughts on this post."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                postAuthorId={postAuthorId}
              />
            ))}
          </div>
        )}

        {/* Load more button */}
        {hasNextPage && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isFetchingNextPage && <Spinner size="sm" />}
              Load more comments
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
