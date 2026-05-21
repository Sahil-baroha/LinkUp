"use client";

/**
 * create-post-trigger.tsx — Clickable card that opens the Create Post modal
 *
 * Stitch spec: border border-slate-200/50 rounded-xl bg-white p-4
 * Click anywhere → setCreatePostModalOpen(true) in ui-store
 */

import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { Avatar } from "@/components/shared/avatar";

export function CreatePostTrigger() {
  const user = useAuthStore((s) => s.user);
  const setOpen = useUiStore((s) => s.setCreatePostModalOpen);

  if (!user) return null;

  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full rounded-xl border border-slate-200/50 bg-white p-4 text-left transition-shadow hover:shadow-sm"
      aria-label="Create a post"
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={user.profilePicture}
          name={user.name}
          size="md"
          seed={user._id}
        />
        <span className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400">
          What&apos;s on your mind?
        </span>
      </div>
    </button>
  );
}
