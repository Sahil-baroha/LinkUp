"use client";

/**
 * post-card.tsx — Primary feed and profile post component
 *
 * Props:
 *   post: FeedPost | Post  — accepts both enriched (feed) and base (single post page)
 *   showFullBody?: boolean — disables line-clamp on single post page (default: false)
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MoreHorizontal, Trash2, Pencil, Share2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useDeletePost, useUpdatePost } from "@/hooks/use-posts";
import { UserAvatar } from "@/components/shared";
import { LikeButton } from "./like-button";
import { PostEditForm } from "./post-edit-form";
import { PostDeleteDialog } from "./post-delete-dialog";
// LikesDialog will be mounted in Q3
import type { Post, FeedPost } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: FeedPost | Post;
  showFullBody?: boolean;
}

export function PostCard({ post, showFullBody = false }: PostCardProps) {
  const user = useAuthStore((s) => s.user);
  const isOwn = user?._id === post.authorId._id;

  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [likesDialogOpen, setLikesDialogOpen] = useState(false);

  const bodyRef = useRef<HTMLParagraphElement>(null);

  // Detect text clamping to decide whether to show "Show more"
  useEffect(() => {
    const el = bodyRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight);
  }, [post.body]);

  const deleteMutation = useDeletePost(user?._id);
  const updateMutation = useUpdatePost(post._id);

  async function handleDelete() {
    deleteMutation.mutate(post._id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        toast.success("Post deleted");
      },
      onError: () => toast.error("Failed to delete post"),
    });
  }

  async function handleUpdate(newBody: string) {
    const formData = new FormData();
    formData.append("body", newBody);
    updateMutation.mutate(formData, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success("Post updated");
      },
      onError: () => toast.error("Failed to update post"),
    });
  }

  function handleShare() {
    const url = `${window.location.origin}/posts/${post._id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success("Link copied to clipboard");
      })
      .catch(() => {
        toast.error("Could not copy link");
      });
  }

  // Detect if post was edited (updatedAt differs from createdAt by more than 5 seconds)
  const isEdited = (() => {
    const created = new Date(post.createdAt).getTime();
    const updated = new Date(post.updatedAt).getTime();
    return updated - created > 5000;
  })();

  const authorId = post.authorId._id;
  const authorName = post.authorId.name || post.authorId.username;
  const likeCount = (post as FeedPost).likeCount ?? 0;

  return (
    <>
      <article className="flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-white p-6 transition-shadow hover:shadow-sm">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/profile/${authorId}`} className="shrink-0">
              <UserAvatar
                src={post.authorId.profilePicture}
                name={authorName}
                size="md"
                seed={authorId}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${authorId}`}
                className="block truncate font-semibold text-[15px] text-slate-900 hover:underline hover:underline-offset-2 transition-colors"
              >
                {authorName}
              </Link>
              {post.authorId.headline && (
                <p className="truncate text-xs text-slate-500">
                  {post.authorId.headline}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <time dateTime={post.createdAt}>
                  {formatRelativeTime(post.createdAt)}
                </time>
                {isEdited && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>Edited</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Author-only options dropdown */}
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="Post options"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  />
                }
              >
                <MoreHorizontal size={16} strokeWidth={1.5} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={14} strokeWidth={1.5} />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Body / Edit mode */}
        {isEditing ? (
          <PostEditForm
            initialBody={post.body}
            onSave={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isPending={updateMutation.isPending}
          />
        ) : (
          <div>
            <p
              ref={bodyRef}
              className={cn(
                "whitespace-pre-wrap text-sm leading-[1.6] text-slate-800",
                !showFullBody && !expanded && "line-clamp-5"
              )}
            >
              {post.body}
            </p>
            {!showFullBody && !expanded && (post.body.length > 300 || isClamped) && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-1.5 text-xs font-semibold text-indigo-600 hover:underline hover:underline-offset-2"
              >
                Show more
              </button>
            )}
          </div>
        )}

        {/* Post image */}
        {post.image?.url && (
          <div className="relative overflow-hidden rounded-lg border border-slate-200/50 max-h-96 w-full bg-slate-100">
            <Image
              src={post.image.url}
              alt="Post image"
              width={1200}
              height={800}
              className="w-full max-h-96 object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
            />
          </div>
        )}

        {/* Action bar */}
        <div className="mt-1 flex items-center justify-between border-t border-slate-200/40 pt-4">
          {/* Left: Like + Comment */}
          <div className="flex items-center gap-4">
            <LikeButton
              postId={post._id}
              initialLiked={(post as FeedPost).isLikedByMe ?? false}
              initialCount={likeCount}
              onCountClick={likeCount > 0 ? () => setLikesDialogOpen(true) : undefined}
            />

            {/* Comment button */}
            {showFullBody ? (
              <button
                type="button"
                className="group flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <MessageSquare
                  size={16}
                  strokeWidth={1.5}
                  className="transition-transform group-hover:scale-110"
                />
                <span className="tabular-nums">
                  {(post as FeedPost).commentCount ?? 0}
                </span>
              </button>
            ) : (
              <Link
                href={`/posts/${post._id}`}
                className="group flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <MessageSquare
                  size={16}
                  strokeWidth={1.5}
                  className="transition-transform group-hover:scale-110"
                />
                <span className="tabular-nums">
                  {(post as FeedPost).commentCount ?? 0}
                </span>
              </Link>
            )}
          </div>

          {/* Right: Share */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share post"
            className="group flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Share2
              size={15}
              strokeWidth={1.5}
              className="transition-transform group-hover:scale-110"
            />
            <span className="text-xs font-medium">Share</span>
          </button>
        </div>
      </article>

      {/* Delete confirmation dialog */}
      <PostDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
