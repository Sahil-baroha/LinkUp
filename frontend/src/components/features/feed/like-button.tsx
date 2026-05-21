"use client";

/**
 * like-button.tsx — Optimistic like/unlike with Framer Motion pop animation
 *
 * State source of truth: TanStack Query cache (via use-posts.ts optimistic update).
 * Local state: animating (for the pop animation only — not for liked status).
 *
 * Reads live count/liked state from the cache. Falls back to initialLiked/initialCount
 * on first render before any mutation has occurred.
 *
 * Icon: ThumbsUp — filled (fill-indigo-600 text-indigo-600) when liked,
 *       unfilled (text-slate-500) when not liked.
 * Spinner replaces icon while mutation isPending.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToggleLike } from "@/hooks/use-posts";
import { Spinner } from "@/components/shared/spinner";
import type { FeedPost, FeedResponse } from "@/types";
import type { InfiniteData } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ postId, initialLiked, initialCount }: LikeButtonProps) {
  const queryClient = useQueryClient();
  const toggleMutation = useToggleLike(postId);
  const [animating, setAnimating] = useState(false);

  // Read current state from the cache (updated by optimistic updates in use-posts.ts)
  const feedData = queryClient.getQueryData<InfiniteData<FeedResponse>>(
    ["feed", "infinite"]
  );
  const cachedPost = feedData?.pages
    .flatMap((p) => p.posts)
    .find((p) => p._id === postId);

  const liked = cachedPost?.isLikedByMe ?? initialLiked;
  const count = cachedPost?.likeCount ?? initialCount;

  function handleClick() {
    if (toggleMutation.isPending) return;

    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
    toggleMutation.mutate();
  }

  return (
    <button
      onClick={handleClick}
      disabled={toggleMutation.isPending}
      aria-label={liked ? "Unlike" : "Like"}
      className="flex items-center gap-1.5 text-sm transition-colors hover:text-indigo-600 disabled:cursor-not-allowed"
    >
      {toggleMutation.isPending ? (
        <Spinner size="sm" />
      ) : (
        <motion.span
          animate={animating ? { scale: [1, 1.4, 0.9, 1] } : {}}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(liked ? "text-indigo-600" : "text-slate-500")}
        >
          <ThumbsUp
            size={16}
            strokeWidth={1.5}
            className={cn(liked && "fill-indigo-600")}
          />
        </motion.span>
      )}
      <span className={cn("tabular-nums", liked ? "text-indigo-600" : "text-slate-500")}>
        {count}
      </span>
    </button>
  );
}
