"use client";

/**
 * (main)/error.tsx — Main Layout Error Boundary
 *
 * Client Component boundary with a Retry button for authenticated routes.
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Main layout error boundary caught:", error);
  }, [error]);

  return (
    <div className="my-8 rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <AlertTriangle size={24} strokeWidth={1.75} />
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        Unable to load this section
      </h2>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
        Something went wrong while rendering this page. You can retry or refresh
        the page.
      </p>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Try again</span>
        </button>
      </div>
    </div>
  );
}
