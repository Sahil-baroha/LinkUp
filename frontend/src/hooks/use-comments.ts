/**
 * use-comments.ts — Comment infinite query and mutations
 *
 * Uses useInfiniteQuery for page-based "Load more".
 *
 * Pagination: page-based (page number 1, 2, ...).
 *   CommentsResponse: { comments, total, page, limit }
 *   Next page = page + 1, stop when page >= ceil(total / limit)
 *
 * Cache key: ['posts', postId, 'comments', 'infinite']
 *   Scoped under the post so invalidating a post's comments doesn't
 *   affect other posts' comment caches.
 *
 * Mutations:
 *   addComment    — optimistic add, invalidates post & feed caches on settled
 *   deleteComment — optimistic removal from cache, invalidates post & feed caches on settled
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
import { useAuthStore } from "@/store/auth-store";
import type { Comment, CommentsResponse } from "@/types";
import { FEED_QUERY_KEY } from "./use-feed";

// ─── Query key factory ────────────────────────────────────────────────────────

export const commentsKey = (postId: string) =>
  ["posts", postId, "comments", "infinite"] as const;

// ─── Infinite query (page-based) ──────────────────────────────────────────────

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

  const total = query.data?.pages[0]?.total ?? comments.length;

  return {
    comments,
    total,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── Add comment (optimistic) ─────────────────────────────────────────────────

type AddCommentContext = {
  previousComments: InfiniteData<CommentsResponse> | undefined;
};

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => addComment(postId, body),

    onMutate: async (newCommentText): Promise<AddCommentContext> => {
      await queryClient.cancelQueries({ queryKey: commentsKey(postId) });

      const previousComments =
        queryClient.getQueryData<InfiniteData<CommentsResponse>>(
          commentsKey(postId)
        );

      const currentUser = useAuthStore.getState().user;

      if (currentUser) {
        const optimisticComment: Comment = {
          _id: `temp-${Date.now()}`,
          postId,
          authorId: {
            _id: currentUser._id,
            name: currentUser.name,
            username: currentUser.username,
            profilePicture: currentUser.profilePicture,
            headline: currentUser.headline,
          },
          body: newCommentText,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<InfiniteData<CommentsResponse>>(
          commentsKey(postId),
          (old) => {
            if (!old) {
              return {
                pageParams: [1],
                pages: [
                  {
                    comments: [optimisticComment],
                    total: 1,
                    page: 1,
                    limit: 20,
                  },
                ],
              };
            }
            return {
              ...old,
              pages: old.pages.map((page, idx) =>
                idx === 0
                  ? {
                      ...page,
                      total: page.total + 1,
                      comments: [optimisticComment, ...page.comments],
                    }
                  : page
              ),
            };
          }
        );
      }

      return { previousComments };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(commentsKey(postId), context.previousComments);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey(postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
  });
}

// ─── Delete comment (optimistic) ─────────────────────────────────────────────

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
              total: Math.max(0, page.total - 1),
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

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey(postId) });
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
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
