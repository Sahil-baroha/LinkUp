/**
 * ui-store.ts — Global UI state (Zustand v5, no persist)
 *
 * This store does NOT use persist middleware.
 * All state resets on page refresh — this is intentional.
 * Modals close, sidebar resets — no stale UI state survives navigation.
 *
 * Responsibilities:
 * - Sidebar open/close state
 * - Create post modal visibility
 * - Editing post context (eliminates prop-drilling into modals)
 *
 * editingPost pattern:
 *   - User clicks "Edit" on a PostCard → call setEditingPost(post)
 *   - CreatePostModal reads editingPost from store
 *   - If non-null → renders in edit mode, pre-filled with post data
 *   - On modal close or successful submit → call setEditingPost(null)
 */

import { create } from "zustand";
import type { Post } from "@/types";

// ─── State shape ─────────────────────────────────────────────────────────────

interface UiState {
  /** Controls the main sidebar visibility on mobile/tablet. */
  sidebarOpen: boolean;

  /** Controls the Create Post modal visibility. */
  createPostModalOpen: boolean;

  /**
   * The post currently being edited.
   * null = create mode. Non-null = edit mode.
   * Set before opening the modal; cleared on close or submit.
   */
  editingPost: Post | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface UiActions {
  setSidebarOpen: (open: boolean) => void;
  setCreatePostModalOpen: (open: boolean) => void;
  /**
   * Set the post to edit, or pass null to clear (return to create mode).
   * Callers should also open the modal after setting this:
   *   setEditingPost(post)
   *   setCreatePostModalOpen(true)
   */
  setEditingPost: (post: Post | null) => void;
}

type UiStore = UiState & UiActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUiStore = create<UiStore>()((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  sidebarOpen: false,
  createPostModalOpen: false,
  editingPost: null,

  // ── Actions ────────────────────────────────────────────────────────────────
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCreatePostModalOpen: (open) => set({ createPostModalOpen: open }),
  setEditingPost: (post) => set({ editingPost: post }),
}));
