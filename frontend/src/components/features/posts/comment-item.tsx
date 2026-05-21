"use client";

/**
 * comment-item.tsx — Individual comment with edit/delete actions
 *
 * Props: comment, postAuthorId (author OR post-owner can delete)
 * Framer Motion: layout + exit animation for smooth deletion.
 * State: isEditing (inline edit mode)
 *
 * Delete: no confirmation dialog — small ephemeral content.
 * Edit: inline Textarea + Save/Cancel buttons.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useDeleteComment, useUpdateComment } from "@/hooks/use-comments";
import { Avatar } from "@/components/shared/avatar";
import { Spinner } from "@/components/shared/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime, cn } from "@/lib/utils";
import Link from "next/link";
import type { Comment } from "@/types";

interface CommentItemProps {
  comment: Comment;
  postAuthorId: string;
}

export function CommentItem({ comment, postAuthorId }: CommentItemProps) {
  const user = useAuthStore((s) => s.user);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);

  const deleteMutation = useDeleteComment(comment.postId);
  const updateMutation = useUpdateComment(comment.postId);

  const isCommentAuthor = user?._id === comment.authorId._id;
  const isPostAuthor = user?._id === postAuthorId;
  const canDelete = isCommentAuthor || isPostAuthor;
  const canEdit = isCommentAuthor;

  function handleDelete() {
    deleteMutation.mutate(comment._id);
  }

  function handleUpdate() {
    if (!editBody.trim()) return;
    updateMutation.mutate(
      { commentId: comment._id, body: editBody },
      {
        onSuccess: () => setIsEditing(false),
      }
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="flex items-start gap-3 py-3">
        {/* Avatar */}
        <Avatar
          src={comment.authorId.profilePicture}
          name={comment.authorId.username}
          size="xs"
          seed={comment.authorId._id}
          className="mt-0.5 shrink-0"
        />

        {/* Content column */}
        <div className="min-w-0 flex-1">
          {/* Header: name + username + timestamp */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/profile/${comment.authorId._id}`}
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              {comment.authorId.username}
            </Link>
            <time
              dateTime={comment.createdAt}
              className="text-xs text-slate-400"
            >
              {formatRelativeTime(comment.createdAt)}
            </time>
          </div>

          {/* Body / Edit mode */}
          {isEditing ? (
            <div className="mt-1.5 space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[64px] resize-none text-sm"
                maxLength={1000}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending || !editBody.trim()}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 disabled:opacity-50 hover:text-indigo-700"
                >
                  {updateMutation.isPending && <Spinner size="sm" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">
              {comment.body}
            </p>
          )}
        </div>

        {/* Action icons */}
        {!isEditing && (canEdit || canDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && (
              <button
                onClick={() => { setIsEditing(true); setEditBody(comment.body); }}
                aria-label="Edit comment"
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-slate-50 hover:text-slate-500 transition-colors"
              >
                <Pencil size={12} strokeWidth={1.5} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                aria-label="Delete comment"
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 size={12} strokeWidth={1.5} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {/* Subtle separator */}
      <div className="ml-9 border-b border-slate-50" />
    </motion.div>
  );
}
