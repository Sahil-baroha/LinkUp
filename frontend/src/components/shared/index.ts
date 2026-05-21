/**
 * index.ts — Barrel re-export for src/components/shared/
 *
 * Import shared primitives from "@/components/shared" instead of
 * individual files to keep import paths clean.
 *
 * Example:
 *   import { Avatar, UserMeta, Spinner, GlassCard } from "@/components/shared"
 */

export { Container }    from "./container";
export { Avatar }       from "./avatar";
export { GlassCard }    from "./glass-card";
export { Spinner, FullPageSpinner } from "./spinner";
export { EmptyState }   from "./empty-state";
export { UserMeta }     from "./user-meta";
export { StoreHydration } from "./store-hydration";
