/**
 * use-feed.ts — Infinite feed query
 *
 * Uses useInfiniteQuery (TanStack Query v5) for cursor-based pagination.
 *
 * Cursor strategy:
 *   - initialPageParam: undefined (first page — backend uses Date.now() as default)
 *   - getNextPageParam: returns nextCursor string if hasMore, else undefined
 *   - undefined (not null) signals TanStack Query that no more pages exist
 *
 * posts is flattened via useMemo to a single array. Components consume
 * this directly — no need to handle pages[n].posts structure.
 *
 * Usage:
 *   const { posts, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed()
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getFeed } from "@/lib/api";
import type { FeedPost } from "@/types";

export const FEED_QUERY_KEY = ["feed", "infinite"] as const;

export function useFeed() {
  const query = useInfiniteQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      getFeed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      // Return undefined (not null) — TanStack Query uses undefined to signal "no more pages"
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  // Flatten pages[n].posts into a single stable array
  const posts = useMemo<FeedPost[]>(
    () => query.data?.pages.flatMap((page) => page.posts) ?? [],
    [query.data?.pages]
  );

  return {
    posts,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
