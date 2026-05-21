/**
 * (main)/layout.tsx — Authenticated app shell
 *
 * Server Component wrapper. The client nav components (TopNavbar, Sidebar,
 * BottomNav) are client-only — they import from Zustand and can be used
 * directly from a Server Component without extra wrapping.
 *
 * Layout spec from Stitch:
 *   - TopNavbar: fixed top, full width, 64px height, z-50
 *   - Sidebar: fixed left, starts at top:64px, hidden <md, w-16 md, w-60 lg
 *   - Main: offset by sidebar, padded, scrollable
 *   - BottomNav: fixed bottom, md:hidden
 *   - Background: #f7f9fb (Stitch surface token)
 *
 * The right panel (feed suggestions) is NOT in this layout.
 * It belongs on the feed page itself in a two-column grid inside <main>.
 *
 * Auth guard: This layout does not redirect — redirect logic lives in individual
 * pages or a middleware.ts. This keeps the layout a pure Server Component.
 */

import { TopNavbar } from "@/components/features/nav/top-navbar";
import { Sidebar } from "@/components/features/nav/sidebar";
import { BottomNav } from "@/components/features/nav/bottom-nav";
import { CreatePostModal } from "@/components/features/feed/create-post-modal";
import { AuthRevalidator } from "@/components/shared/auth-revalidator";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Silently refreshes Zustand store with server-fresh user data on mount */}
      <AuthRevalidator />

      {/* Fixed top navbar */}
      <TopNavbar />

      {/* Page body — offset for fixed navbar */}
      <div className="flex pt-16">
        {/* Fixed sidebar — hidden below md, w-16 on tablet, w-60 on desktop */}
        <Sidebar />

        {/* Main content area — offset by sidebar width */}
        <main className="flex-1 min-w-0 ml-0 md:ml-16 lg:ml-60">
          <div className="mx-auto max-w-[860px] px-4 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Fixed bottom nav — mobile only */}
      <BottomNav />

      {/*
        CreatePostModal is rendered here (at shell level) so it persists
        across page navigations without unmounting. Controlled by ui-store.
      */}
      <CreatePostModal />
    </div>
  );
}
