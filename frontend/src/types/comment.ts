/**
 * comment.ts — Comment types
 *
 * Source verified against:
 *   - models/comments.model.js
 *   - repositories/comment.repository.js
 *       → AUTHOR_PROJECTION = "username profilePicture"
 *       → getCommentsByPost() returns { comments, total }
 *       → createComment() / updateComment() return a single populated comment
 *   - controllers/comment.controller.js
 *       → getComments  → data: { total, page, limit, comments }
 *       → addComment   → data: { comment }
 *       → editComment  → data: { comment }
 *       → deleteComment → data: null
 */

import type { PostAuthor } from "./user";

// ─── Comment ────────────────────────────────────────────────────────────────

/**
 * A comment document as returned by the API.
 * authorId is always POPULATED with "username profilePicture" projection + _id.
 * postId is a raw ObjectId string (never populated).
 */
export interface Comment {
  _id: string;
  postId: string;       // Raw ObjectId string — never populated
  authorId: PostAuthor; // Populated: { _id, username, profilePicture }
  body: string;
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

// ─── Comments list response ─────────────────────────────────────────────────

/**
 * Response shape from GET /posts/:postId/comments
 * Source: comment.controller.js → data: result
 *         comment.repository.js → getCommentsByPost() returns { comments, total }
 *         comment.controller.js → adds page and limit from query params
 */
export interface CommentsResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
}

// ─── Single comment response ────────────────────────────────────────────────

/**
 * Response shape from POST /posts/:postId/comments (addComment)
 * and PATCH /posts/:postId/comments/:commentId (editComment).
 * Source: comment.controller.js → data: { comment }
 */
export interface CommentResponse {
  comment: Comment;
}

// ─── Payloads ────────────────────────────────────────────────────────────────

/** Body for POST /posts/:postId/comments */
export interface CreateCommentPayload {
  body: string;
}

/** Body for PATCH /posts/:postId/comments/:commentId */
export interface UpdateCommentPayload {
  body: string;
}
