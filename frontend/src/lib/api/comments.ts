/**
 * comments.ts — Comment API functions
 *
 * Source verified against:
 *   - routes/post.routes.js
 *   - controllers/comment.controller.js
 *   - repositories/comment.repository.js
 *       → getCommentsByPost returns { comments, total }
 *       → controller adds page/limit: data: result → { total, page, limit, comments }
 *       → addComment  → data: { comment }
 *       → editComment → data: { comment }
 *       → deleteComment → data: null
 */

import apiClient from "./client";
import type { ApiResponse } from "@/types";
import type { CommentsResponse, CommentResponse } from "@/types";
import type { Comment } from "@/types";

/**
 * GET /posts/:postId/comments?page=&limit=
 * Returns paginated comments with total count.
 */
export async function getComments(
  postId: string,
  page = 1,
  limit = 20
): Promise<CommentsResponse> {
  const res = await apiClient.get<ApiResponse<CommentsResponse>>(
    `/posts/${postId}/comments`,
    { params: { page, limit } }
  );
  return res.data.data;
}

/**
 * POST /posts/:postId/comments
 * Adds a new comment to a post.
 * Source: comment.controller.js → data: { comment }
 */
export async function addComment(
  postId: string,
  body: string
): Promise<Comment> {
  const res = await apiClient.post<ApiResponse<CommentResponse>>(
    `/posts/${postId}/comments`,
    { body }
  );
  return res.data.data.comment;
}

/**
 * PATCH /posts/:postId/comments/:commentId
 * Edits a comment body. Only the comment author can edit.
 * Source: comment.controller.js → data: { comment }
 */
export async function updateComment(
  postId: string,
  commentId: string,
  body: string
): Promise<Comment> {
  const res = await apiClient.patch<ApiResponse<CommentResponse>>(
    `/posts/${postId}/comments/${commentId}`,
    { body }
  );
  return res.data.data.comment;
}

/**
 * DELETE /posts/:postId/comments/:commentId
 * Deletes a comment. Comment author OR post author can delete.
 * Source: comment.controller.js → data: null
 */
export async function deleteComment(
  postId: string,
  commentId: string
): Promise<void> {
  await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
}
