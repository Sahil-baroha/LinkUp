/**
 * not-found.tsx — 404 Page
 *
 * Server Component. GoToFeedButton is a tiny 'use client' wrapper
 * so useRouter() can be called without making the entire page a client component.
 */

import { GoToFeedButton } from "./go-to-feed-button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f9fb] px-6 text-center">
      {/* 404 display */}
      <p className="text-8xl font-bold tracking-tight text-slate-100 select-none">
        404
      </p>

      <div className="mt-4 space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>

      <div className="mt-8">
        <GoToFeedButton />
      </div>
    </div>
  );
}
