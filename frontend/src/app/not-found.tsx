"use client";

/**
 * not-found.tsx — 404 Not Found Page
 *
 * Restyled with shared EmptyState primitive and design tokens.
 */

import { useRouter } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/shared";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xs">
        <EmptyState
          icon={FileQuestion}
          title="Page not found"
          description="The page you're looking for doesn't exist or has been moved."
          action={{
            label: "Go to feed",
            onClick: () => router.push("/feed"),
          }}
        />
      </div>
    </div>
  );
}
