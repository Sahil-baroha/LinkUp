/**
 * use-posts.ts — Post queries and mutations (including optimistic like toggle)
 *
 * Exports focused hooks, each owning a specific concern:
 *
 *   usePost(postId)              — single post query
 *   useUserPosts(userId)         — all posts by a user
 *   useCreatePost(currentUserId) — create post mutation
 *   useDeletePost(userId)        — delete post mutation (removes from feed cache)
 *   useUpdatePost(postId)        — update post mutation
 *   useToggleLike(postId)        — optimistic like/unlike
 *
 * OPTIMISTIC LIKE STRATEGY:
 *   1. Cancel in-flight queries for ['posts', postId] and FEED_QUERY_KEY
 *   2. Snapshot both previous values
 *   3. Optimistically update both caches synchronously
 *   4. On error: restore both snapshots via onError context
 *   5. On settled: do NOT invalidate — the optimistic state IS correct.
 *      onSuccess may use the server's { liked, likeCount } to correct any
 *      race-condition count drift.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  getPost,
  getUserPosts,
  createPost,
  deletePost,
  updatePost,
  toggleLike,
} from "@/lib/api";
import { FEED_QUERY_KEY } from "./use-feed";
import type { Post, FeedPost, FeedResponse } from "@/types";

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ["posts", postId],
    queryFn: () => getPost(postId!),
    enabled: !!postId,
  });
}

export function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ["posts", "user", userId],
    queryFn: () => getUserPosts(userId!),
    enabled: !!userId,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreatePost(currentUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => createPost(formData),
    onSuccess: () => {
      // New post must appear in feed and user's post list
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
      if (currentUserId) {
        queryClient.invalidateQueries({
          queryKey: ["posts", "user", currentUserId],
        });
      }
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeletePost(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_data, postId) => {
      // Remove the deleted post from the feed cache without a full refetch
      queryClient.setQueryData<InfiniteData<FeedResponse>>(
        FEED_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.filter((p) => p._id !== postId),
            })),
          };
        }
      );
      // Invalidate the user's post list
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: ["posts", "user", userId],
        });
      }
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function useUpdatePost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => updatePost(postId, formData),
    onSuccess: (updatedPost) => {
      // Refresh the single post cache
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });

      // Update the post in-place in feed cache if present (avoids full refetch)
      queryClient.setQueryData<InfiniteData<FeedResponse>>(
        FEED_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p._id === postId ? { ...p, ...updatedPost } : p
              ),
            })),
          };
        }
      );
    },
  });
}

// ─── Optimistic Like Toggle ───────────────────────────────────────────────────

type LikeContext = {
  previousPost: Post | undefined;
  previousFeed: InfiniteData<FeedResponse> | undefined;
};

export function useToggleLike(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => toggleLike(postId),

    onMutate: async (): Promise<LikeContext> => {
      // Step 1: Cancel any in-flight queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["posts", postId] });
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });

      // Step 2: Snapshot previous values for rollback
      const previousPost = queryClient.getQueryData<Post>(["posts", postId]);
      const previousFeed =
        queryClient.getQueryData<InfiniteData<FeedResponse>>(FEED_QUERY_KEY);

      // Step 3a: Optimistically update single post cache
      if (previousPost) {
        queryClient.setQueryData<Post>(["posts", postId], {
          ...previousPost,
          // FeedPost fields may not exist on base Post — guard safely
          isLikedByMe: !(previousPost as FeedPost).isLikedByMe,
          likeCount: (previousPost as FeedPost).isLikedByMe
            ? (previousPost as FeedPost).likeCount - 1
            : (previousPost as FeedPost).likeCount + 1,
        } as Post);
      }

      // Step 3b: Optimistically update the post in the feed cache
      queryClient.setQueryData<InfiniteData<FeedResponse>>(
        FEED_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p._id === postId
                  ? {
                      ...p,
                      isLikedByMe: !p.isLikedByMe,
                      likeCount: p.isLikedByMe
                        ? p.likeCount - 1
                        : p.likeCount + 1,
                    }
                  : p
              ),
            })),
          };
        }
      );

      return { previousPost, previousFeed };
    },

    onError: (_err, _vars, context) => {
      // Restore both caches from snapshots on failure
      if (context?.previousPost) {
        queryClient.setQueryData(["posts", postId], context.previousPost);
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(FEED_QUERY_KEY, context.previousFeed);
      }
    },

    onSuccess: (result) => {
      // Use server-authoritative likeCount to correct any race-condition drift.
      // Do NOT invalidate — optimistic update is correct if no race occurred.
      queryClient.setQueryData<InfiniteData<FeedResponse>>(
        FEED_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((p) =>
                p._id === postId
                  ? { ...p, isLikedByMe: result.liked, likeCount: result.likeCount }
                  : p
              ),
            })),
          };
        }
      );
    },

    // onSettled: intentionally omitted — no invalidation needed.
    // The optimistic update + onSuccess server correction IS the final state.
  });
}
