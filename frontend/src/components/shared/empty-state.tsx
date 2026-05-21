/**
 * empty-state.tsx — Zero-data state primitive
 *
 * Verified against Stitch design system:
 *   - Icon: text-slate-300 (muted — not prominent, decorative only)
 *   - Title: text-slate-700 font-semibold (clear but not alarming)
 *   - Description: text-slate-400 text-sm
 *   - Action button: primary (deep navy bg, white text)
 *   - Vertical breathing room: py-16 (64px top + bottom)
 *
 * Used by: Feed empty state, Connections tab, Comments, Search no-results.
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Lucide icon component (e.g., Users, MessageSquare, Search) */
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional CTA. Renders a primary button below the description. */
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      {/* Icon — muted, decorative */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
        <Icon size={32} strokeWidth={1.5} className="text-slate-300" />
      </div>

      {/* Title */}
      <h3 className="mb-1 text-base font-semibold text-slate-700">{title}</h3>

      {/* Description */}
      <p className="max-w-xs text-sm text-slate-400">{description}</p>

      {/* Optional CTA */}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-6 rounded-lg bg-[#0f172a] px-5 py-2.5",
            "text-sm font-medium text-white",
            "transition-opacity hover:opacity-90 active:opacity-80"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
