/**
 * container.tsx — Page-level max-width and gutter primitive
 *
 * Single source of truth for layout width constraints.
 * Verified against Stitch design system:
 *   container-max: 1280px
 *   gutter: 24px (desktop) / margin-mobile: 16px (mobile)
 *
 * Used by: every page layout, feed center column, profile page, connections page.
 */

import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1280px] px-6 md:px-4",
        className
      )}
    >
      {children}
    </div>
  );
}
