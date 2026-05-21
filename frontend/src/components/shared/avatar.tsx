/**
 * avatar.tsx — Circular user avatar with initials fallback
 *
 * Verified against Stitch design system:
 *   - Fallback: bg-indigo-100 text-indigo-700 (Stitch accent color)
 *   - Ring: ring-1 ring-slate-200 on all sizes ("barely there" border)
 *   - Uses next/image for all src URLs (requires remotePatterns in next.config.ts)
 *
 * next/image prerequisite: Phase 0 configured res.cloudinary.com in next.config.ts.
 * All profile pictures are Cloudinary URLs — next/image optimization applies.
 */

import Image from "next/image";
import { cn, getInitials, generateAvatarColor } from "@/lib/utils";

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE_MAP = {
  xs: { px: 24,  className: "h-6 w-6 text-[10px]"  },
  sm: { px: 32,  className: "h-8 w-8 text-xs"       },
  md: { px: 40,  className: "h-10 w-10 text-sm"     },
  lg: { px: 56,  className: "h-14 w-14 text-base"   },
  xl: { px: 80,  className: "h-20 w-20 text-xl"     },
} as const;

type AvatarSize = keyof typeof SIZE_MAP;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
  /** Seed for deterministic fallback color — use user._id for consistency. */
  seed?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Avatar({
  src,
  name,
  size = "md",
  className,
  seed,
}: AvatarProps) {
  const { px, className: sizeClass } = SIZE_MAP[size];
  const colors = generateAvatarColor(seed ?? name);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
        "ring-1 ring-slate-200",
        sizeClass,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${px}px`}
          className="object-cover"
          onError={(e) => {
            // Hide broken image to reveal the initials fallback beneath
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}

      {/* Initials fallback — visible when src is absent or image errors */}
      <div
        aria-hidden={!!src}
        className={cn(
          "absolute inset-0 flex items-center justify-center font-medium",
          colors.bg,
          colors.text
        )}
      >
        {initials}
      </div>
    </div>
  );
}
