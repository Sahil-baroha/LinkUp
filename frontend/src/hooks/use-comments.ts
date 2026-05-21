/**
 * use-comments.ts — Comment infinite query and mutations
 *
 * Uses useInfiniteQuery (not plain useQuery) so "Load more" works without
 * re-fetching earlier pages.
 *
 * Pagination: offset-based (page number, not cursor).
 *   CommentsResponse: { comments, total, page, limit }
 *   Next page = page + 1, stop when page >= ceil(total / limit)
 *
 * Cache key: ['posts', postId, 'comments', 'infinite']
 *   Scoped under the post so invalidating a post's comments doesn't
 *   affect other posts' comment caches.
 *
 * Mutations:
 *   addComment    — invalidates the comment list (new comment at top)
 *   deleteComment — optimistic removal from cache, restore on error
 *   updateComment — direct cache update for the single changed comment
 */

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getComments,
  addComment,
  deleteComment,
  updateComment,
} from "@/lib/api";
import type { Comment, CommentsResponse } from "@/types";

// ─── Query key factory ────────────────────────────────────────────────────────

const commentsKey = (postId: string) =>
  ["posts", postId, "comments", "infinite"] as const;

// ─── Infinite query ───────────────────────────────────────────────────────────

export function useComments(postId: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: commentsKey(postId!),
    queryFn: ({ pageParam }) =>
      getComments(postId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    enabled: !!postId,
  });

  // Flatten pages[n].comments into a single stable array
  const comments = useMemo<Comment[]>(
    () => query.data?.pages.flatMap((page) => page.comments) ?? [],
    [query.data?.pages]
  );

  return {
    comments,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── Add comment ──────────────────────────────────────────────────────────────

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => addComment(postId, body),
    onSuccess: () => {
      // Invalidate so the new comment appears (inserted at server-sort position)
      queryClient.invalidateQueries({ queryKey: commentsKey(postId) });
    },
  });
}

// ─── Delete comment (optimistic) ──────────────────────────────────────────────

type DeleteCommentContext = {
  previousComments: InfiniteData<CommentsResponse> | undefined;
};

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(postId, commentId),

    onMutate: async (commentId): Promise<DeleteCommentContext> => {
      await queryClient.cancelQueries({ queryKey: commentsKey(postId) });

      const previousComments =
        queryClient.getQueryData<InfiniteData<CommentsResponse>>(
          commentsKey(postId)
        );

      // Optimistically remove the comment from the cache
      queryClient.setQueryData<InfiniteData<CommentsResponse>>(
        commentsKey(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              total: page.total - 1,
              comments: page.comments.filter((c) => c._id !== commentId),
            })),
          };
        }
      );

      return { previousComments };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(commentsKey(postId), context.previousComments);
      }
    },
  });
}

// ─── Update comment (direct cache update) ────────────────────────────────────

export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      updateComment(postId, commentId, body),

    onSuccess: (updatedComment) => {
      // Patch the single comment in-place — avoids refetching the whole list
      queryClient.setQueryData<InfiniteData<CommentsResponse>>(
        commentsKey(postId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              comments: page.comments.map((c) =>
                c._id === updatedComment._id ? updatedComment : c
              ),
            })),
          };
        }
      );
    },
  });
}
