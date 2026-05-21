/**
 * user-meta.tsx — Avatar + name + username + optional timestamp
 *
 * The repeating visual pattern extracted from Stitch screens:
 *   - Post cards (author row)
 *   - Comment items (commenter row)
 *   - Connection cards (connected user info)
 *   - Search result items (user search)
 *   - Incoming/Sent request cards
 *
 * Verified from Stitch "Main Feed" and "Single Post & Comments View":
 *   - Name: font-semibold text-slate-900, clickable → /profile/[id]
 *   - Username: text-slate-400 text-sm, prefixed with "@"
 *   - Timestamp: text-slate-400 text-xs, below username, relative format
 *   - size="sm": Avatar sm (32px), slightly tighter text
 *   - size="md": Avatar md (40px), standard text sizes
 */

import Link from "next/link";
import { Avatar } from "./avatar";
import { formatRelativeTime, cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserMetaUser {
  _id: string;
  name: string;
  username: string;
  profilePicture?: string | null;
}

interface UserMetaProps {
  user: UserMetaUser;
  size?: "sm" | "md";
  /** ISO 8601 string or Date — displayed as relative time if provided */
  timestamp?: string | Date;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserMeta({
  user,
  size = "md",
  timestamp,
  className,
}: UserMetaProps) {
  const avatarSize = size === "sm" ? "sm" : "md";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Avatar */}
      <Avatar
        src={user.profilePicture}
        name={user.name}
        size={avatarSize}
        seed={user._id}
      />

      {/* Text column */}
      <div className="min-w-0 flex-1">
        {/* Name — clickable link to profile */}
        <Link
          href={`/profile/${user._id}`}
          className={cn(
            "block truncate font-semibold text-slate-900",
            "hover:underline hover:underline-offset-2",
            "transition-colors",
            size === "sm" ? "text-sm" : "text-[15px]"
          )}
        >
          {user.name}
        </Link>

        {/* Username + optional timestamp */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-slate-400",
              size === "sm" ? "text-xs" : "text-sm"
            )}
          >
            @{user.username}
          </span>

          {timestamp && (
            <>
              <span className="text-slate-300 text-xs">·</span>
              <time
                dateTime={
                  typeof timestamp === "string"
                    ? timestamp
                    : timestamp.toISOString()
                }
                className="shrink-0 text-slate-400 text-xs"
              >
                {formatRelativeTime(timestamp)}
              </time>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
