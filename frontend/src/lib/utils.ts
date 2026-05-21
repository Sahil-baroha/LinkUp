import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

// ─── Core ─────────────────────────────────────────────────────────────────────

/** Merge Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

/**
 * Extract initials from a full name.
 * Takes first letter of first word and first letter of last word.
 * Returns "?" if name is empty or whitespace only.
 *
 * Examples:
 *   "Sarah Jenkins"      → "SJ"
 *   "Marcus"             → "M"
 *   "Elena Rodriguez"    → "ER"
 *   ""                   → "?"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generate a deterministic avatar background color from a seed string.
 * Used for profile cover gradients and avatar fallback variants.
 * Seeded from user._id so each user always gets the same color.
 *
 * Returns a Tailwind gradient class pair [bg, text] from the Stitch palette.
 */
const AVATAR_COLORS = [
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-slate-100",  text: "text-slate-700"  },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-100",   text: "text-blue-700"   },
  { bg: "bg-sky-100",    text: "text-sky-700"     },
] as const;

export function generateAvatarColor(seed: string): (typeof AVATAR_COLORS)[number] {
  if (!seed) return AVATAR_COLORS[0];
  // Simple, stable hash: sum char codes, modulo palette length
  const hash = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Time ─────────────────────────────────────────────────────────────────────

/**
 * Format a date as a human-readable relative time string.
 * Uses date-fns formatDistanceToNow with addSuffix: true.
 *
 * Examples:
 *   "2 hours ago"
 *   "about 1 month ago"
 *   "less than a minute ago"
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const parsed = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(parsed, { addSuffix: true });
  } catch {
    return "";
  }
}
