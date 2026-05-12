/**
 * feed.ts — Feed API function
 *
 * Source verified against:
 *   - routes/feed.routes.js     → GET / (cursor-paginated)
 *   - controllers/feed.controller.js
 *   - services/feed.service.js  → returns { posts, hasMore, nextCursor }
 *   - validators/feed.validator.js (cursor + limit are optional query params)
 */

import apiClient from "./client";
import type { ApiResponse } from "@/types";
import type { FeedResponse } from "@/types";

/**
 * GET /feed?cursor=&limit=
 *
 * Fetches a cursor-paginated, enriched post stream from the current
 * user's accepted connections.
 *
 * @param cursor - ISO 8601 date string. Only posts older than this are returned.
 *                 Omit (or pass undefined) to fetch the first page.
 * @param limit  - Number of posts per page. Backend default applies if omitted.
 *
 * Returns { posts: FeedPost[], hasMore: boolean, nextCursor: string | null }
 *
 * Pagination pattern:
 *   1. Call getFeed() — use nextCursor from the response as the cursor for the next call
 *   2. Stop fetching when hasMore === false
 */
export async function getFeed(
  cursor?: string,
  limit?: number
): Promise<FeedResponse> {
  const res = await apiClient.get<ApiResponse<FeedResponse>>("/feed", {
    params: {
      ...(cursor !== undefined && { cursor }),
      ...(limit  !== undefined && { limit }),
    },
  });
  return res.data.data;
}
