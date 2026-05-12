/**
 * posts.ts — Post CRUD API functions
 *
 * Source verified against:
 *   - routes/post.routes.js
 *   - controllers/post.controller.js
 *   - middleware/upload.middleware.js → multerInstance.single("image")
 *
 * IMPORTANT: The multipart field name for images is "image" (not "postImage").
 * Confirmed from upload.middleware.js line 32: multerInstance.single("image")
 */

import apiClient from "./client";
import type { ApiResponse } from "@/types";
import type { Post } from "@/types";

/**
 * POST /posts
 * Creates a new post. Sent as multipart/form-data.
 * Accepts: body (required text), image (optional File — field name: "image").
 */
export async function createPost(formData: FormData): Promise<Post> {
  const res = await apiClient.post<ApiResponse<Post>>("/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

/**
 * GET /posts/:postId
 * Returns a single post with populated author (username, profilePicture).
 */
export async function getPost(postId: string): Promise<Post> {
  const res = await apiClient.get<ApiResponse<Post>>(`/posts/${postId}`);
  return res.data.data;
}

/**
 * GET /posts/user/:userId
 * Returns all posts by a specific user, newest first.
 * Source: routes/post.routes.js — /user/:userId declared BEFORE /:postId
 */
export async function getUserPosts(userId: string): Promise<Post[]> {
  const res = await apiClient.get<ApiResponse<Post[]>>(`/posts/user/${userId}`);
  return res.data.data;
}

/**
 * PATCH /posts/:postId
 * Edits a post's body and/or image. Sent as multipart/form-data.
 * Ownership enforced server-side (only author can edit).
 */
export async function updatePost(
  postId: string,
  formData: FormData
): Promise<Post> {
  const res = await apiClient.patch<ApiResponse<Post>>(
    `/posts/${postId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data.data;
}

/**
 * DELETE /posts/:postId
 * Deletes a post and cascade-deletes all its comments and likes.
 * Ownership enforced server-side.
 */
export async function deletePost(postId: string): Promise<void> {
  await apiClient.delete(`/posts/${postId}`);
}
