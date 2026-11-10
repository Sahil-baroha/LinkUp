"use client";

/**
 * create-post-trigger.tsx — Clickable card that opens the Create Post modal
 *
 * Stitch spec:
 *   - border border-slate-200/60 rounded-xl bg-white p-4 shadow-sm
 *   - hover: border brightens + shadow lifts
 *   - Input area: rounded-full px-4 py-2.5 bg-slate-50 border border-slate-200
 *   - Text: "Share an update..."
 *   - Image action button on right side
 *   - Click anywhere (except image button) → opens CreatePostModal
 */

import { ImagePlus } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { Avatar } from "@/components/shared/avatar";

export function CreatePostTrigger() {
  const user = useAuthStore((s) => s.user);
  const setOpen = useUiStore((s) => s.setCreatePostModalOpen);

  if (!user) return null;

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:border-slate-300/70 hover:shadow-md">
      <div className="flex items-center gap-3">
        <Avatar
          src={user.profilePicture}
          name={user.name}
          size="md"
          seed={user._id}
        />

        {/* Fake input — clicking opens modal */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Create a post"
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-white"
        >
          Share an update...
        </button>

        {/* Image shortcut — opens modal directly */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Add a photo to your post"
          title="Add photo"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ImagePlus size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
