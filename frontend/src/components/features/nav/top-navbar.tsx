"use client";

/**
 * top-navbar.tsx — Fixed glassmorphism top navigation bar
 *
 * Stitch spec: fixed top, full width, z-50, height 64px
 * Glassmorphism: backdrop-blur-md bg-white/70 border-b border-slate-200/50
 *
 * Zones:
 *   Left:   LinkUp wordmark → /feed
 *   Center: Desktop-only search input (hidden below md)
 *   Right:  Mobile search toggle | Notification bell | User avatar + dropdown
 *
 * Mobile search: Framer Motion AnimatePresence slide-down panel.
 * Auth safety: right zone renders null if user is not yet hydrated.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Search, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { logout } from "@/lib/api";
import { Avatar } from "@/components/shared/avatar";
import { UserSearch } from "@/components/features/connections/user-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNavbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const mobileSearchOpen = useUiStore((s) => s.sidebarOpen); // reuse sidebarOpen as mobile search flag
  const [mobileSearchOpen_, setMobileSearchOpen] = useState(false);

  async function handleSignOut() {
    try {
      await logout();
    } finally {
      clearAuth();
      router.push("/login");
      toast.success("You've been signed out");
    }
  }

  return (
    <header className="fixed top-0 z-50 w-full">
      {/* Main bar */}
      <div className="h-16 backdrop-blur-md bg-white/70 border-b border-slate-200/50 px-6">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-4">

          {/* ── Left: Wordmark ─────────────────────────────────── */}
          <Link
            href="/feed"
            className="flex shrink-0 items-center gap-2 font-semibold text-[#0f172a] text-lg tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4f46e5] text-white text-xs font-bold">
              L
            </span>
            <span className="hidden sm:inline">LinkUp</span>
          </Link>

          {/* ── Center: Desktop search ─────────────────────────── */}
          <div className="hidden md:flex flex-1 max-w-sm">
            <UserSearch className="w-full" />
          </div>

          {/* ── Right zone ────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen((p) => !p)}
              aria-label="Toggle search"
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            {/* Notification bell — placeholder, non-interactive */}
            <button
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={18} strokeWidth={1.5} />
            </button>

            {/* User avatar + dropdown — only rendered after hydration */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      aria-label="User menu"
                      className="rounded-full ring-2 ring-transparent hover:ring-slate-200 transition-all"
                    />
                  }
                >
                  <Avatar
                    src={user.profilePicture}
                    name={user.name}
                    size="sm"
                    seed={user._id}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => router.push(`/profile/${user._id}`)}
                    className="cursor-pointer gap-2"
                  >
                    <UserIcon size={14} strokeWidth={1.5} />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Placeholder width to prevent layout shift during rehydration
              <div className="h-8 w-8 rounded-full bg-slate-100" />
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile search slide-down ──────────────────────────── */}
      <AnimatePresence>
        {mobileSearchOpen_ && (
          <motion.div
            key="mobile-search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden backdrop-blur-md bg-white/90 border-b border-slate-200/50 md:hidden"
          >
            <div className="px-4 py-3">
              <UserSearch className="w-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
