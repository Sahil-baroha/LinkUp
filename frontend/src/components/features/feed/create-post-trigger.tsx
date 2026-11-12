"use client";

/**
 * create-post-trigger.tsx — Card trigger for the Create Post modal
 *
 * Requirements:
 *   - Becomes a Card with UserAvatar
 *   - "Start a post" button
 *   - "Photo" button that opens the same modal
 */

import { Image as ImageIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { Card, UserAvatar } from "@/components/shared";

export function CreatePostTrigger() {
  const user = useAuthStore((s) => s.user);
  const setOpen = useUiStore((s) => s.setCreatePostModalOpen);

  if (!user) return null;

  return (
    <Card className="p-4 transition-all hover:border-slate-300/70 hover:shadow-md">
      <div className="flex items-center gap-3">
        <UserAvatar
          src={user.profilePicture}
          name={user.name || user.username}
          size="md"
          seed={user._id}
        />

        {/* "Start a post" button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Start a post"
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-white"
        >
          Start a post
        </button>

        {/* "Photo" button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Add photo"
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ImageIcon size={18} strokeWidth={1.5} className="text-emerald-600" />
          <span>Photo</span>
        </button>
      </div>
    </Card>
  );
}
