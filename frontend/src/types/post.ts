/**
 * post.ts — Post, FeedPost, and related types
 *
 * Source verified against:
 *   - models/posts.model.js
 *   - repositories/post.repository.js → AUTHOR_PROJECTION = "username profilePicture"
 *   - repositories/post.repository.js → findById(), findByAuthor(), update()
 *   - services/feed.service.js        → enrichment merges likeCount, isLikedByMe, commentCount
 *   - controllers/like.controller.js  → toggleLike returns { liked, likeCount }
 *   - repositories/like.repository.js → getLikesByPost returns { likeCount, users, page, limit }
 */

import type { PostAuthor } from "./user";

// ─── Post Image ─────────────────────────────────────────────────────────────

/**
 * Embedded image sub-document on a post.
 * Source: models/posts.model.js → image: { url, publicId }
 * Both fields default to null when no image is attached.
 */
export interface PostImage {
  url: string | null;
  publicId: string | null;
}

// ─── Base Post ──────────────────────────────────────────────────────────────

/**
 * Post as returned by:
 *   - GET  /posts/:postId
 *   - GET  /posts/user/:userId
 *   - POST /posts
 *   - PATCH /posts/:postId
 *
 * authorId is always POPULATED (never a raw ObjectId string).
 * Projection: "username profilePicture" + _id (added by Mongoose).
 */
export interface Post {
  _id: string;
  authorId: PostAuthor;
  body: string;
  image: PostImage;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ─── Feed Post ──────────────────────────────────────────────────────────────

/**
 * Enriched post as returned exclusively by GET /feed.
 * Extends Post with like/comment aggregation fields merged in feed.service.js.
 *
 * Source: feed.service.js (Step 5 — enrichment spread):
 *   ...post,
 *   likeCount:    likeEntry?.count    ?? 0,
 *   isLikedByMe:  (likeEntry?.likedByMe ?? 0) > 0,
 *   commentCount: commentCountMap.get(pid) ?? 0,
 */
export interface FeedPost extends Post {
  likeCount: number;
  isLikedByMe: boolean;
  commentCount: number;
}

// ─── Feed response ──────────────────────────────────────────────────────────

/**
 * Response from GET /feed
 * Source: feed.service.js → returns { posts, hasMore, nextCursor }
 */
export interface FeedResponse {
  posts: FeedPost[];
  hasMore: boolean;
  nextCursor: string | null;
}

// ─── Like types ──────────────────────────────────────────────────────────────

/**
 * Response from POST /posts/:postId/like (toggle)
 * Source: like.service.js → returns { liked, likeCount }
 */
export interface LikeToggleResult {
  liked: boolean;
  likeCount: number;
}

/**
 * Response from GET /posts/:postId/likes
 * Source: like.repository.js → getLikesByPost() returns { likeCount, users, page, limit }
 *
 * NOTE: `users` is the array of user objects (not Like documents).
 * The repo does: users.map(l => l.userId) — so each entry is a populated PostAuthor.
 */
export interface LikesResponse {
  likeCount: number;
  users: PostAuthor[];
  page: number;
  limit: number;
}

// ─── Create / Update payloads ───────────────────────────────────────────────

/**
 * POST /posts — sent as multipart/form-data.
 * `postImage` is the File; handled by the caller, not typed here.
 */
export interface CreatePostPayload {
  body: string;
}

/**
 * PATCH /posts/:postId — sent as multipart/form-data.
 * At least one field must be present.
 */
export interface UpdatePostPayload {
  body?: string;
}
