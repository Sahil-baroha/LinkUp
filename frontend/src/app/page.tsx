"use client";

/**
 * page.tsx — Root redirect
 *
 * Checks Zustand auth state after hydration.
 * Authenticated → /feed, Unauthenticated → /login
 * Shows centered Spinner while determining.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Spinner } from "@/components/shared/spinner";

export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (user) {
      router.replace("/feed");
    } else {
      router.replace("/login");
    }
  }, [hasHydrated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb]">
      <Spinner size="md" />
    </div>
  );
}
