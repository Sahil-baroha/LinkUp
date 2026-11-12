/**
 * card.tsx — Padded surface primitive
 *
 * Plain bordered card (no blur). Use for feed cards, profile sections,
 * connection cards — any content surface over the page background.
 */

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({ children, className, as: Element = "div" }: CardProps) {
  return (
    <Element
      className={cn(
        "rounded-xl border border-slate-200/60 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </Element>
  );
}
