"use client";

/**
 * auth-revalidator.tsx — Refreshes the Zustand auth store from the server.
 *
 * Runs once when the authenticated shell mounts.
 * Calls GET /users/:id with the currently stored user._id.
 * On success: calls setUser() to overwrite the persisted (possibly stale)
 * user object with server-fresh data (updated name, profilePicture, etc.)
 *
 * Placed inside (main)/layout.tsx so it runs on every authenticated page.
 * Returns null — renders nothing.
 *
 * Design: avoids a useQuery here to keep dependencies minimal.
 * A single useEffect + fetch is sufficient since this runs once per mount.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { getUserById } from "@/lib/api/users";

export function AuthRevalidator() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!user?._id) return;

    // Fire-and-forget refresh — do not block render
    getUserById(user._id)
      .then((freshUser) => {
        setUser(freshUser);
      })
      .catch(() => {
        // Silently ignore — stale data is acceptable.
        // The 401 interceptor in client.ts handles expired sessions.
      });
    // Only run on mount (user._id won't change while this component is mounted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
