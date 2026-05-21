/**
 * glass-card.tsx — Glassmorphism surface primitive
 *
 * Verified against Stitch design system:
 *   - Glass Layer: backdrop-blur 12–20px, bg-white/70, 1px border
 *   - Radius: xl (1.5rem) for modals/overlays
 *   - Ambient shadow: ultra-diffused, 10% navy tint, 40px blur, 0 offset
 *
 * Used by: navbar background on scroll, Create Post modal, Edit Profile modal,
 *          user search dropdown, any panel floating over content.
 *
 * NOT used by: regular feed cards, connection cards, profile header
 *   → those use the plain bordered card pattern (no blur).
 */

import { cn } from "@/lib/utils";

type GlassCardElement = "div" | "section" | "aside";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Override the rendered HTML element for semantics. Default: div. */
  as?: GlassCardElement;
}

export function GlassCard({
  children,
  className,
  as: Element = "div",
}: GlassCardProps) {
  return (
    <Element
      className={cn(
        // Glassmorphism surface
        "backdrop-blur-md bg-white/70",
        // Stitch "barely there" border
        "border border-slate-200/50",
        // Stitch xl radius for overlays
        "rounded-2xl",
        // Ambient shadow — navy tint, ultra-diffused
        "shadow-[0_0_40px_0_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
    </Element>
  );
}
