"use client";

/**
 * post-card.tsx — Primary feed and profile post component
 *
 * Props:
 *   post: FeedPost | Post  — accepts both enriched (feed) and base (single post page)
 *   showFullBody?: boolean — disables line-clamp on single post page (default: false)
 *
 * Stitch spec: border border-slate-200/30 rounded-xl bg-white p-6 gap-4
 * Action bar: justify-between, like+comment left, (share right)
 * Like button: group hover with scale-110 icon animation
 * Body: text-slate-800 leading-[1.5] (Stitch body-md: 14px 1.5 line-height)
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Pencil, Share2 } from "lucide-react";
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

  function handleShare() {
    const url = `${window.location.origin}/posts/${post._id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard");
    }).catch(() => {
      toast.error("Could not copy link");
    });
  }

  // Detect if post was edited (updatedAt differs from createdAt by more than 5 seconds)
  const isEdited = (() => {
    const created = new Date(post.createdAt).getTime();
    const updated = new Date(post.updatedAt).getTime();
    return updated - created > 5000;
  })();

  return (
    <>
      <article className="flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-white p-6 transition-shadow hover:shadow-sm">

        {/* ── Header row ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <UserMeta
            user={{
              _id: post.authorId._id,
              name: post.authorId.username,
              username: post.authorId.username,
              profilePicture: post.authorId.profilePicture,
            }}
            timestamp={post.createdAt}
            isEdited={isEdited}
          />

          {/* Author-only options dropdown */}
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
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
                  className="flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-all hover:bg-slate-700 active:scale-[0.98]"
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
                "whitespace-pre-wrap text-sm leading-[1.6] text-slate-800",
                !showFullBody && !expanded && "line-clamp-3"
              )}
            >
              {post.body}
            </p>
            {!showFullBody && !expanded && isClamped && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-1.5 text-xs font-semibold text-indigo-600 hover:underline hover:underline-offset-2"
              >
                See more
              </button>
            )}
          </div>
        )}

        {/* ── Post image ────────────────────────────────────── */}
        {post.image?.url && (
          <div className="relative overflow-hidden rounded-lg border border-slate-200/50">
            <Image
              src={post.image.url}
              alt="Post image"
              width={640}
              height={360}
              className="w-full object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
            />
          </div>
        )}

        {/* ── Action bar ────────────────────────────────────── */}
        <div className="mt-1 flex items-center justify-between border-t border-slate-200/40 pt-4">
          {/* Left: Like + Comment */}
          <div className="flex items-center gap-4">
            <LikeButton
              postId={post._id}
              initialLiked={(post as FeedPost).isLikedByMe ?? false}
              initialCount={(post as FeedPost).likeCount ?? 0}
            />

            {/* Comment button */}
            {showFullBody ? (
              <button className="group flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
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
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {deleteMutation.isPending ? <Spinner size="sm" /> : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
