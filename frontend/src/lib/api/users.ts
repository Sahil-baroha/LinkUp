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
import type { User, UserSearchResult, UpdateUserPayload, SuggestionUser } from "@/types";

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
 * Updates allowed profile fields.
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
 * PUT /users/:id/avatar
 * Uploads user avatar image via multipart/form-data.
 * Ownership enforced server-side — users can only update their own avatar.
 */
export async function updateAvatar(
  userId: string,
  file: File
): Promise<User> {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await apiClient.put<ApiResponse<User>>(`/users/${userId}/avatar`, formData);
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

/**
 * GET /users/suggestions?limit=N
 * Returns connection suggestions for the current user.
 * Shape: [{_id, name, username, profilePicture, headline, mutualCount}]
 * Source: user.service.js → getSuggestions()
 */
export async function getSuggestions(limit: number): Promise<SuggestionUser[]> {
  const res = await apiClient.get<ApiResponse<SuggestionUser[]>>("/users/suggestions", {
    params: { limit },
  });
  return res.data.data;
}
