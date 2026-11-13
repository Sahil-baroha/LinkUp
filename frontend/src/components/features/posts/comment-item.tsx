"use client";

/**
 * comment-item.tsx — Individual comment with edit/delete actions
 *
 * Props: comment, postAuthorId
 * Permissions:
 *   - Edit: comment author only
 *   - Delete: comment author OR post author (both backed by backend permission check)
 *
 * Features:
 *   - UserAvatar, name link to profile, headline, relative time
 *   - Plain text with whitespace-pre-line
 *   - Inline edit textarea with Save / Cancel and character counter (cap: 1000)
 *   - Delete with confirmation dialog
 */

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useDeleteComment, useUpdateComment } from "@/hooks/use-comments";
import { UserAvatar } from "@/components/shared";
import { Spinner } from "@/components/shared/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { formatRelativeTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Comment } from "@/types";

interface CommentItemProps {
  comment: Comment;
  postAuthorId: string;
}

const MAX_COMMENT_LENGTH = 1000;

export function CommentItem({ comment, postAuthorId }: CommentItemProps) {
  const user = useAuthStore((s) => s.user);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useDeleteComment(comment.postId);
  const updateMutation = useUpdateComment(comment.postId);

  const isCommentAuthor = user?._id === comment.authorId._id;
  const isPostAuthor = user?._id === postAuthorId;
  const canDelete = isCommentAuthor || isPostAuthor;
  const canEdit = isCommentAuthor;

  const displayName =
    comment.authorId.name || comment.authorId.username || "User";

  function handleSaveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return;
    updateMutation.mutate(
      { commentId: comment._id, body: trimmed },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success("Comment updated");
        },
        onError: () => {
          toast.error("Failed to update comment");
        },
      }
    );
  }

  function handleConfirmDelete() {
    deleteMutation.mutate(comment._id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        toast.success("Comment deleted");
      },
      onError: () => {
        toast.error("Failed to delete comment");
      },
    });
  }

  return (
    <div className="group relative flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
      {/* Avatar */}
      <Link href={`/profile/${comment.authorId._id}`} className="shrink-0 mt-0.5">
        <UserAvatar
          src={comment.authorId.profilePicture}
          name={displayName}
          size="sm"
          seed={comment.authorId._id}
        />
      </Link>

      {/* Main Column */}
      <div className="min-w-0 flex-1">
        {/* Header: Name, Headline, Timestamp */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Link
            href={`/profile/${comment.authorId._id}`}
            className="font-semibold text-slate-900 hover:text-brand hover:underline"
          >
            {displayName}
          </Link>
          {comment.authorId.headline && (
            <span className="text-slate-500 truncate max-w-[200px] sm:max-w-xs">
              • {comment.authorId.headline}
            </span>
          )}
          <time
            dateTime={comment.createdAt}
            className="text-slate-400 ml-auto shrink-0"
          >
            {formatRelativeTime(comment.createdAt)}
          </time>
        </div>

        {/* Body or Inline Edit Mode */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[70px] resize-none text-sm bg-slate-50 focus:bg-white"
              maxLength={MAX_COMMENT_LENGTH}
              disabled={updateMutation.isPending}
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(
                  editBody.length > MAX_COMMENT_LENGTH
                    ? "text-red-500 font-medium"
                    : "text-slate-400"
                )}
              >
                {editBody.length}/{MAX_COMMENT_LENGTH}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditBody(comment.body);
                  }}
                  disabled={updateMutation.isPending}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={
                    updateMutation.isPending ||
                    !editBody.trim() ||
                    editBody.trim() === comment.body ||
                    editBody.length > MAX_COMMENT_LENGTH
                  }
                  className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1 font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {updateMutation.isPending && <Spinner size="sm" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-800 whitespace-pre-line break-words">
            {comment.body}
          </p>
        )}
      </div>

      {/* Action buttons (Edit & Delete) */}
      {!isEditing && (canEdit || canDelete) && (
        <div className="flex shrink-0 items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditBody(comment.body);
              }}
              aria-label="Edit comment"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <Pencil size={13} strokeWidth={1.5} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              aria-label="Delete comment"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this comment? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                />
              }
            >
              Cancel
            </DialogClose>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {deleteMutation.isPending && <Spinner size="sm" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
