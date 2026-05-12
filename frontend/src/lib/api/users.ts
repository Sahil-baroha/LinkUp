/**
 * users.ts — User API functions
 *
 * Source verified against:
 *   - routes/user.routes.js
 *   - controllers/user.controller.js
 *   - repositories/user.repository.js → search() returns { users, total, page, pages }
 */

import apiClient from "./client";
import type { ApiResponse } from "@/types";
import type { User, UserSearchResult, UpdateUserPayload } from "@/types";

/**
 * GET /users/:id
 * Returns a public user profile (no password).
 */
export async function getUserById(id: string): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
  return res.data.data;
}

/**
 * PATCH /users/:id
 * Updates only username and/or profilePicture.
 * Ownership enforced server-side — users can only update their own profile.
 */
export async function updateUser(
  id: string,
  data: UpdateUserPayload
): Promise<User> {
  const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
  return res.data.data;
}

/**
 * GET /users/search?q=&page=&limit=
 * Case-insensitive search on username OR name. Excludes inactive accounts.
 * Returns { users, total, page, pages }.
 */
export async function searchUsers(
  q: string,
  page = 1,
  limit = 10
): Promise<UserSearchResult> {
  const res = await apiClient.get<ApiResponse<UserSearchResult>>("/users/search", {
    params: { q, page, limit },
  });
  return res.data.data;
}

/**
 * DELETE /users/:id
 * Soft-deletes the account (sets active = false). Data is preserved.
 * Ownership enforced server-side.
 */
export async function deactivateAccount(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
