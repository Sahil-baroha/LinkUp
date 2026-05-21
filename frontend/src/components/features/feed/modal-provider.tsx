"use client";

/**
 * modal-provider.tsx — Client-only CreatePostModal mount point.
 *
 * Extracted from (main)/layout.tsx so the layout stays a Server Component.
 * This component owns the CreatePostModal — rendering it here at the shell
 * level means the modal persists across all (main) route navigations.
 */

import { CreatePostModal } from "@/components/features/feed/create-post-modal";

export function ModalProvider() {
  return <CreatePostModal />;
}
