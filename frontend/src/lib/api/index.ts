/**
 * index.ts — Barrel re-export for src/lib/api/
 *
 * Import API functions from "@/lib/api" instead of individual files.
 *
 * Example:
 *   import { login, register, getFeed, toggleLike } from "@/lib/api";
 *
 * The Axios client instance is intentionally NOT re-exported here —
 * it should only be imported directly by the API function files,
 * never used in components or hooks.
 */

export * from "./auth";
export * from "./users";
export * from "./posts";
export * from "./likes";
export * from "./comments";
export * from "./connections";
export * from "./feed";
