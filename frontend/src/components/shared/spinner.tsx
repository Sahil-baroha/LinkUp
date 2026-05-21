/**
 * spinner.tsx — Framer Motion loading indicator
 *
 * Verified against Stitch design system:
 *   - Accent color: indigo-600 (#4F46E5) for the active arc
 *   - Track color: slate-200 for the background ring
 *   - Does NOT use Lucide Loader2 — Framer Motion continuous rotation
 *     matches the design system's animation treatment
 *
 * Used inline inside buttons and as a standalone loading state.
 */

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE_MAP = {
  sm: "h-4 w-4",   // 16px — inside buttons
  md: "h-5 w-5",   // 20px — inline states
  lg: "h-8 w-8",   // 32px — full section loading
} as const;

type SpinnerSize = keyof typeof SIZE_MAP;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <motion.div
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-full border-2",
        "border-slate-200 border-t-indigo-600", // Stitch accent arc
        SIZE_MAP[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

// ─── Full-page variant ────────────────────────────────────────────────────────

/**
 * Full viewport centered spinner — used while awaiting _hasHydrated.
 * Pattern: if (!_hasHydrated) return <FullPageSpinner />
 */
export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f7f9fb]">
      <Spinner size="lg" />
    </div>
  );
}
