"use client";

/**
 * store-hydration.tsx — Zero-render client component for Zustand persist rehydration
 *
 * Problem: Zustand's persist middleware auto-reads localStorage on import,
 * which crashes on the server (window is undefined).
 *
 * Solution: skipHydration: true in auth-store prevents the auto-read.
 * This component manually calls rehydrate() after client mount, which triggers
 * onRehydrateStorage → setHasHydrated(true) as designed.
 *
 * Renders nothing. Placed in root layout alongside QueryProvider.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function StoreHydration() {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);

  return null;
}
