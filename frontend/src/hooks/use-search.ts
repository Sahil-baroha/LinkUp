/**
 * use-search.ts — Debounced user search
 *
 * The component owns raw input state and passes it here.
 * This hook owns only the debounced query and its cache.
 *
 * Debounce: 400ms — fires the query only after the user stops typing.
 * Minimum length: 1 character — avoids fetching on empty string.
 * staleTime: 60s — search results are considered fresh for 60 seconds.
 *   Avoids redundant refetches as the user types the same query again.
 *
 * Usage:
 *   const [rawQuery, setRawQuery] = useState('')
 *   const { results, isLoading } = useSearch(rawQuery)
 */

import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "@/lib/api";
import { useDebounce } from "./use-debounce";

export function useSearch(rawQuery: string, page = 1, limit = 10) {
  const debouncedQuery = useDebounce(rawQuery, 400);

  const query = useQuery({
    queryKey: ["users", "search", debouncedQuery, page, limit],
    queryFn: () => searchUsers(debouncedQuery, page, limit),
    enabled: debouncedQuery.trim().length >= 1,
    staleTime: 60_000, // 60s — search results stay fresh across quick re-queries
  });

  return {
    results: query.data?.users ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching, // Useful for showing a subtle loading indicator on refetch
    isError: query.isError,
    debouncedQuery, // Expose so component can show "Searching for X..."
  };
}
