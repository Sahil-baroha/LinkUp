/**
 * likes.ts — Like API functions
 *
 * Source verified against:
 *   - routes/post.routes.js → POST /:postId/like, GET /:postId/likes
 *   - controllers/like.controller.js
 *   - services/like.service.js → toggleLike returns { liked, likeCount }
 *   - repositories/like.repository.js → getLikesByPost returns { likeCount, users, page, limit }
 */

import apiClient from "./client";
import type { ApiResponse } from "@/types";
import type { LikeToggleResult, LikesResponse } from "@/types";

/**
 * POST /posts/:postId/like
 * Toggles like/unlike for the current user on a post.
 * Returns { liked: boolean, likeCount: number }.
 */
export async function toggleLike(postId: string): Promise<LikeToggleResult> {
  const res = await apiClient.post<ApiResponse<LikeToggleResult>>(
    `/posts/${postId}/like`
  );
  return res.data.data;
}

/**
 * GET /posts/:postId/likes
 * Returns paginated list of users who liked the post, plus the like count.
 * Returns { likeCount, users, page, limit }.
 */
export async function getPostLikes(
  postId: string,
  page = 1,
  limit = 20
): Promise<LikesResponse> {
  const res = await apiClient.get<ApiResponse<LikesResponse>>(
    `/posts/${postId}/likes`,
    { params: { page, limit } }
  );
  return res.data.data;
}
