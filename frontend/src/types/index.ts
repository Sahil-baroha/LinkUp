/**
 * index.ts — Central re-export barrel for all types
 *
 * Import from "@/types" instead of individual files to keep
 * import paths short and refactor-friendly.
 *
 * Example:
 *   import type { User, Post, FeedPost, ApiResponse } from "@/types";
 */

export type * from "./api";
export type * from "./user";
export type * from "./post";
export type * from "./comment";
export type * from "./connection";
