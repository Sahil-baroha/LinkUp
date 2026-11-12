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

// ─── Sub-document types ───────────────────────────────────────────────────

export interface ExperienceItem {
  title: string;
  company: string;
  startDate: string; // "YYYY-MM" format
  endDate?: string | null; // "YYYY-MM" format or null
  current?: boolean;
  description?: string;
}

export interface EducationItem {
  school: string;
  degree?: string;
  field?: string;
  startYear: number;
  endYear?: number | null;
}

export type RelationshipStatus = "none" | "pending_sent" | "pending_received" | "connected";

export interface ConnectionRelationship {
  status: RelationshipStatus;
  requestId: string | null;
}

// ─── Core User ─────────────────────────────────────────────────────────────

/** Full user object as returned by the API (no password field ever). */
export interface User {
  _id: string;
  name: string;
  username: string;
  email?: string; // Only present for the user themselves
  profilePicture: string; // Cloudinary URL or "" (never null — default is '')
  headline?: string;
  about?: string;
  location?: string;
  skills?: string[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  connection?: ConnectionRelationship; // Only present when viewing another user's profile
  active?: boolean;
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
 *
 * NOTE: `name` and `headline` are optional — backend AUTHOR_PROJECTION does NOT
 * project them on post/comment/like queries. They may be absent in those contexts.
 */
export interface PostAuthor {
  _id: string;
  username: string;
  profilePicture: string;
  /** Only present if the backend projection includes "name" (e.g. suggestions) */
  name?: string;
  /** Only present if the backend projection includes "headline" (e.g. suggestions) */
  headline?: string;
}

// ─── Suggestion user ─────────────────────────────────────────────────────────

/**
 * User shape returned by GET /users/suggestions
 * Source: user.service.js → getSuggestions() returns {_id, name, username, profilePicture, headline, mutualCount}
 */
export interface SuggestionUser {
  _id: string;
  name: string;
  username: string;
  profilePicture: string;
  headline?: string;
  mutualCount: number;
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
  headline?: string;
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
 * Source: validators/user.validator.js → updateUserSchema
 */
export interface UpdateUserPayload {
  name?: string;
  username?: string;
  profilePicture?: string; // Must be a valid URL string
  headline?: string;
  about?: string;
  location?: string;
  skills?: string[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
}
