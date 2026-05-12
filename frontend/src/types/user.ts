/**
 * user.ts — User types
 *
 * Source verified against:
 *   - models/user.model.js         (schema fields)
 *   - repositories/user.repository.js → findById() select("-password")
 *   - repositories/user.repository.js → search() select("-password")
 *   - controllers/auth.controller.js  → register returns full user
 *   - controllers/user.controller.js  → getUserById, updateUserProfile
 *
 * NOTE: `password` is NEVER present in any API response.
 */

// ─── Core User ─────────────────────────────────────────────────────────────

/** Full user object as returned by the API (no password field ever). */
export interface User {
  _id: string;
  name: string;
  username: string;
  email: string;
  profilePicture: string; // Cloudinary URL or "" (never null — default is '')
  active: boolean;
  createdAt: string;      // ISO 8601 date string (Mongoose timestamps)
  updatedAt: string;
}

// ─── Projection variants ────────────────────────────────────────────────────

/**
 * Minimal user shape used when another document's author/user field is
 * populated. Backend uses AUTHOR_PROJECTION = "username profilePicture"
 * for posts and comments, and "name username profilePicture" for connections.
 *
 * Source:
 *   - post.repository.js  const AUTHOR_PROJECTION = "username profilePicture"
 *   - comment.repository.js const AUTHOR_PROJECTION = "username profilePicture"
 *   - like.repository.js  const USER_PROJECTION   = "username profilePicture"
 *
 * _id is always included by Mongoose populate even when not explicitly selected.
 */
export interface PostAuthor {
  _id: string;
  username: string;
  profilePicture: string;
}

/**
 * Slightly wider projection used in connection populate queries.
 * Source: connection.repository.js → populate("senderId", "name username profilePicture")
 */
export interface ConnectionUser {
  _id: string;
  name: string;
  username: string;
  profilePicture: string;
}

// ─── Search response ────────────────────────────────────────────────────────

/**
 * Response shape from GET /users/search
 * Source: user.repository.js → search() returns { users, total, page, pages }
 */
export interface UserSearchResult {
  users: User[];
  total: number;
  page: number;
  pages: number;
}

// ─── Update payload ─────────────────────────────────────────────────────────

/**
 * Body for PATCH /users/:id
 * Source: validators/user.validator.js → updateUserSchema (username, profilePicture only)
 */
export interface UpdateUserPayload {
  username?: string;
  profilePicture?: string; // Must be a valid URL string
}
