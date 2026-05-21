"use client";

import { useRouter } from "next/navigation";

/**
 * go-to-feed-button.tsx — 'use client' wrapper for the 404 page CTA.
 *
 * Isolated here so not-found.tsx can remain a Server Component.
 */
export function GoToFeedButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/feed")}
      className="rounded-lg bg-[#0f172a] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      Go to Feed
    </button>
  );
}
