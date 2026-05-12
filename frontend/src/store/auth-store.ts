/**
 * auth-store.ts — Authentication state (Zustand v5 + persist)
 *
 * Design decisions:
 * - persist middleware writes ONLY `user` to localStorage (key: 'linkup-auth')
 * - `_hasHydrated` is a runtime flag — NEVER persisted. Always starts false.
 * - `isAuthenticated` is NOT stored. Derive it inline: `user !== null`
 *   This ensures it is always in sync and never stale from localStorage.
 * - `clearAuth` sets user → null but leaves _hasHydrated true (store is
 *   hydrated, it just has no user — these are orthogonal concerns)
 * - migrate stub included at version 1 for future User shape upgrades
 *
 * _hasHydrated usage pattern in components:
 *   const { user, _hasHydrated } = useAuthStore()
 *   if (!_hasHydrated) return <FullPageSpinner />
 *   if (!user) redirect('/login')
 *
 * Phase 4 note: use-auth.ts must fire a GET /users/:id query after hydration
 * to overwrite the cached user with server-fresh data (prevents stale profile).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

// ─── State shape ─────────────────────────────────────────────────────────────

interface AuthState {
  /** Authenticated user. null when logged out or not yet hydrated. */
  user: User | null;

  /**
   * Runtime hydration flag. Starts false on every page load.
   * Set to true once persist middleware has finished reading localStorage.
   * Use to prevent flash of unauthenticated UI on hard refresh.
   */
  _hasHydrated: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface AuthActions {
  /**
   * Set or overwrite the authenticated user.
   * Called on login and when Phase 4's use-auth.ts refreshes server data.
   */
  setUser: (user: User) => void;

  /**
   * Clear auth state. Sets user to null.
   * _hasHydrated remains true — the store is hydrated, just unauthenticated.
   * persist will write { user: null } to localStorage on the next render cycle.
   */
  clearAuth: () => void;

  /** Called by onRehydrateStorage when localStorage read is complete. */
  setHasHydrated: (state: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      user: null,
      _hasHydrated: false,

      // ── Actions ────────────────────────────────────────────────────────────
      setUser: (user) => set({ user }),

      clearAuth: () => set({ user: null }),
      // NOTE: _hasHydrated is intentionally NOT reset here.

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      // ── Persist config ─────────────────────────────────────────────────────
      name: "linkup-auth",
      storage: createJSONStorage(() => localStorage),
      version: 1,

      /**
       * Persist ONLY the user field.
       * _hasHydrated must never be persisted — it is a runtime flag that
       * must always start false on a fresh page load by design.
       */
      partialize: (state) => ({ user: state.user }),

      /**
       * Migration stub — run when the persisted version doesn't match `version`.
       * Increment `version` whenever the User type shape changes to trigger this.
       *
       * version 0 → 1: no field changes, no migration needed.
       */
      migrate: (persistedState, _version) => {
        // Future migrations go here, e.g.:
        // if (_version === 0) { add/rename fields on persistedState }
        return persistedState;
      },

      /**
       * Fires after localStorage has been read and the store populated.
       * Sets _hasHydrated to true regardless of whether rehydration
       * succeeded or failed — components only need to know it's done.
       */
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
