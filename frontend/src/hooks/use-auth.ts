/**
 * use-auth.ts — Synchronous auth state reader
 *
 * Design: This hook is SYNCHRONOUS. It reads only from Zustand — no query,
 * no loading state, no async work. Fast on every render.
 *
 * The revalidation query (GET /users/:id) lives exclusively in
 * src/app/(main)/layout.tsx, not here. It runs once when the authenticated
 * shell mounts and calls setUser() to refresh store from server.
 *
 * isAuthenticated is derived, never stored — avoids stale boolean drift.
 * _hasHydrated gates auth-dependent rendering to prevent flash of
 * unauthenticated UI on hard refresh for logged-in users.
 *
 * Usage:
 *   const { user, isAuthenticated, _hasHydrated } = useAuth()
 *   if (!_hasHydrated) return <FullPageSpinner />
 *   if (!isAuthenticated) redirect('/login')
 */

import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types";

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean; // Derived: user !== null — never stale
  _hasHydrated: boolean;    // Gate auth-dependent rendering on this
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export function useAuth(): UseAuthReturn {
  const user = useAuthStore((state) => state.user);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return {
    user,
    isAuthenticated: user !== null, // Computed inline — always in sync
    _hasHydrated,
    setUser,
    clearAuth,
  };
}
