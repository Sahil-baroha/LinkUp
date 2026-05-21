"use client";

/**
 * comment-section.tsx — Post comments with infinite scroll and mutations
 *
 * Props: postId, postAuthorId (for deletion permission in CommentItem)
 *
 * Structure:
 *   - Heading + total count
 *   - Add comment form (avatar + textarea + submit)
 *   - Comment list with Framer Motion AnimatePresence
 *   - "Load more" button when hasNextPage
 *   - EmptyState when no comments
 */

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useComments, useAddComment } from "@/hooks/use-comments";
import { Avatar } from "@/components/shared/avatar";
import { Spinner } from "@/components/shared/spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { CommentItem } from "./comment-item";

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
}

export function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const user = useAuthStore((s) => s.user);
  const [body, setBody] = useState("");

  const { comments, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useComments(postId);
  const addMutation = useAddComment(postId);

  const total = comments.length; // approximate — actual from first page

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || addMutation.isPending) return;
    addMutation.mutate(body, {
      onSuccess: () => setBody(""),
    });
  }

  return (
    <section className="mt-6 space-y-4">
      {/* Section heading */}
      <h2 className="text-sm font-semibold text-slate-900">
        Comments
        {total > 0 && (
          <span className="ml-2 font-normal text-slate-400">({total})</span>
        )}
      </h2>

      {/* Add comment form */}
      {user && (
        <form onSubmit={handleSubmit} className="flex items-start gap-3">
          <Avatar
            src={user.profilePicture}
            name={user.name}
            size="sm"
            seed={user._id}
            className="mt-1 shrink-0"
          />
          <div className="flex flex-1 flex-col gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment..."
              className="min-h-[72px] resize-none text-sm"
              maxLength={1000}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!body.trim() || addMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-opacity"
              >
                {addMutation.isPending && <Spinner size="sm" />}
                Post
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description="Be the first to comment on this post."
        />
      ) : (
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                postAuthorId={postAuthorId}
              />
            ))}
          </AnimatePresence>

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-3">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline disabled:opacity-50"
              >
                {isFetchingNextPage && <Spinner size="sm" />}
                Load more comments
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
