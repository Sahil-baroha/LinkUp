/**
 * api.ts — Envelope and shared API types
 *
 * Every backend response is wrapped in ApiResponse<T>.
 * Source: utils/response.js → ApiResponse.success() / ApiResponse.error()
 */

// ─── Envelope ──────────────────────────────────────────────────────────────

/** The standard wrapper around every API response from the backend. */
export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Validation ────────────────────────────────────────────────────────────

/**
 * Zod validation errors returned as `errors` array on 422 responses.
 * Each item describes a single field-level validation failure.
 */
export interface ValidationError {
  path: string;
  message: string;
}

/** Error response shape (success: false). */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
}

// ─── Pagination ────────────────────────────────────────────────────────────

/**
 * Offset-based pagination envelope.
 * Used by: GET /users/search
 * Source: user.repository.js → search() returns { users, total, page, pages }
 */
export interface PaginatedResponse<T> {
  items: T[];   // normalised — backend may call this field by a domain name (e.g. "users")
  total: number;
  page: number;
  pages: number;
}

/**
 * Cursor-based pagination envelope.
 * Used exclusively by: GET /feed
 * Source: feed.service.js → returns { posts, hasMore, nextCursor }
 */
export interface CursorPaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
}
