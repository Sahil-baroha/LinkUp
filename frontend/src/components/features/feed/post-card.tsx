"use client";

/**
 * post-card.tsx — Primary feed and profile post component
 *
 * Props:
 *   post: FeedPost | Post  — accepts both enriched (feed) and base (single post page)
 *   showFullBody?: boolean — disables line-clamp on single post page (default: false)
 *
 * Stitch spec: border border-slate-200/50 rounded-xl bg-white p-6 space-y-4
 * No shadow — cards use the "barely there" border treatment only.
 *
 * State: isEditing, expanded, deleteConfirmOpen
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useDeletePost, useUpdatePost } from "@/hooks/use-posts";
import { UserMeta } from "@/components/shared/user-meta";
import { Spinner } from "@/components/shared/spinner";
import { LikeButton } from "./like-button";
import type { Post, FeedPost } from "@/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

interface PostCardProps {
  post: FeedPost | Post;
  showFullBody?: boolean;
}

export function PostCard({ post, showFullBody = false }: PostCardProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOwn = user?._id === post.authorId._id;

  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const bodyRef = useRef<HTMLParagraphElement>(null);

  // Detect text clamping to decide whether to show "See more"
  useEffect(() => {
    const el = bodyRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight);
  }, [post.body]);

  const deleteMutation = useDeletePost(user?._id);
  const updateMutation = useUpdatePost(post._id);

  const isFeedPost = "isLikedByMe" in post;

  async function handleDelete() {
    deleteMutation.mutate(post._id, {
      onSuccess: () => toast.success("Post deleted"),
      onError: () => toast.error("Failed to delete post"),
    });
  }

  async function handleUpdate() {
    const formData = new FormData();
    formData.append("body", editBody);
    updateMutation.mutate(formData, {
      onSuccess: () => {
        setIsEditing(false);
        toast.success("Post updated");
      },
      onError: () => toast.error("Failed to update post"),
    });
  }

  return (
    <>
      <article className="space-y-4 rounded-xl border border-slate-200/50 bg-white p-6">

        {/* ── Header row ─────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <UserMeta
            user={{
              _id: post.authorId._id,
              name: post.authorId.username, // PostAuthor has no `name` — username is the display identity
              username: post.authorId.username,
              profilePicture: post.authorId.profilePicture,
            }}
            timestamp={post.createdAt}
          />

          {/* Author-only options dropdown */}
          {isOwn && (
            <DropdownMenu>
          <DropdownMenuTrigger
              render={
                <button
                  aria-label="Post options"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 transition-colors"
                />
              }
            >
              <MoreHorizontal size={16} strokeWidth={1.5} />
            </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => { setIsEditing(true); setEditBody(post.body); }}
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

        {/* ── Body / Edit mode ───────────────────────────────── */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[100px] resize-none text-sm"
              maxLength={3000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{editBody.length} / 3000</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending || !editBody.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-opacity"
                >
                  {updateMutation.isPending && <Spinner size="sm" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p
              ref={bodyRef}
              className={cn(
                "whitespace-pre-wrap text-sm leading-relaxed text-slate-700",
                !showFullBody && !expanded && "line-clamp-3"
              )}
            >
              {post.body}
            </p>
            {!showFullBody && !expanded && isClamped && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-1 text-xs font-medium text-indigo-600 hover:underline"
              >
                See more
              </button>
            )}
          </div>
        )}

        {/* ── Post image ────────────────────────────────────── */}
        {post.image?.url && (
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <Image
              src={post.image.url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
          </div>
        )}

        {/* ── Action bar ────────────────────────────────────── */}
        <div className="flex items-center gap-4 border-t border-slate-100 pt-3">
          <LikeButton
            postId={post._id}
            initialLiked={(post as FeedPost).isLikedByMe ?? false}
            initialCount={(post as FeedPost).likeCount ?? 0}
          />

          {/* Comment button */}
          {showFullBody ? (
            <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              <MessageSquare size={16} strokeWidth={1.5} />
              <span>{(post as FeedPost).commentCount ?? 0}</span>
            </button>
          ) : (
            <Link
              href={`/posts/${post._id}`}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <MessageSquare size={16} strokeWidth={1.5} />
              <span>{(post as FeedPost).commentCount ?? 0}</span>
            </Link>
          )}
        </div>
      </article>

      {/* ── Delete confirmation dialog ──────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The post and all its comments will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors" />
              }
            >
              Cancel
            </DialogClose>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleteMutation.isPending ? <Spinner size="sm" /> : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
