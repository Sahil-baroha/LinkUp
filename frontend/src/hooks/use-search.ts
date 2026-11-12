/**
 * use-search.ts — Debounced user search
 *
 * Requirements:
 *   - Debounce: 300ms
 *   - Minimum length: 2 characters (backend requires >= 2 chars)
 *   - Limit: 8 results for header search dropdown
 *   - skipRateLimitToast: true (so 429 can be handled inline without double toast)
 *   - Exposes results, isLoading, isError, error, debouncedQuery
 */

import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "@/lib/api";
import { useDebounce } from "./use-debounce";

export function useSearch(rawQuery: string, page = 1, limit = 8) {
  const debouncedQuery = useDebounce(rawQuery, 300);
  const trimmed = debouncedQuery.trim();

  const query = useQuery({
    queryKey: ["users", "search", trimmed, page, limit],
    queryFn: () =>
      searchUsers(trimmed, page, limit, { skipRateLimitToast: true }),
    enabled: trimmed.length >= 2,
    staleTime: 60_000,
    retry: false, // Don't spam retries on 429/400
  });

  return {
    results: query.data?.users ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading && trimmed.length >= 2,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    debouncedQuery: trimmed,
  };
}
