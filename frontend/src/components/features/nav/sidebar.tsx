"use client";

/**
 * sidebar.tsx — Fixed left sidebar navigation
 *
 * Stitch spec:
 *   - Desktop (lg+): w-60 full sidebar with text labels
 *   - Tablet (md to lg): w-16 icon-only rail with Tooltip labels
 *   - Mobile (<md): hidden (BottomNav takes over)
 *
 * Active link: text-indigo-600 bg-indigo-50
 * Inactive link: text-slate-600 hover:bg-slate-50
 * Connections badge: bg-indigo-600 text-white (Stitch accent, not red)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Users, User } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useIncomingRequests } from "@/hooks/use-connections";
import { Avatar } from "@/components/shared/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/feed",        icon: House,  label: "Home"        },
  { href: "/connections", icon: Users,  label: "Connections" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { data: incomingRequests } = useIncomingRequests();
  const pendingCount = incomingRequests?.length ?? 0;

  if (!user) return null;

  function isActive(href: string) {
    if (href === "/feed") return pathname === "/feed";
    return pathname.startsWith(href);
  }

  return (
    <TooltipProvider delay={300}>
      <aside className="hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] w-16 lg:w-60 border-r border-slate-200/50 bg-white/70 backdrop-blur-md z-40 shrink-0">

        {/* ── User mini-card ─────────────────────────────────── */}
        <div className="flex flex-col items-center lg:items-start gap-3 px-3 lg:px-4 py-5 border-b border-slate-100">
          <Link href={`/profile/${user._id}`} className="flex items-center gap-3 min-w-0">
            <Avatar
              src={user.profilePicture}
              name={user.name}
              size="md"
              seed={user._id}
              className="shrink-0"
            />
            <div className="hidden lg:block min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-400">@{user.username}</p>
            </div>
          </Link>
        </div>

        {/* ── Navigation links ────────────────────────────────── */}
        <nav className="flex flex-col gap-1 px-2 py-4">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            const isPending = label === "Connections" && pendingCount > 0;

            return (
              <Tooltip key={href}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      active
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  />
                }
              >
                <span className="relative shrink-0">
                  <Icon size={20} strokeWidth={1.5} />
                  {/* Badge on icon (both rail and full sidebar) */}
                  {isPending && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </span>
                <span className="hidden lg:inline text-sm font-medium">{label}</span>
              </TooltipTrigger>
                {/* Tooltip only shows on tablet (icon-only rail) */}
                <TooltipContent side="right" className="lg:hidden">
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Profile link — dynamic href */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/profile/${user._id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    pathname.startsWith("/profile")
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                />
              }
            >
              <User size={20} strokeWidth={1.5} className="shrink-0" />
              <span className="hidden lg:inline text-sm font-medium">Profile</span>
            </TooltipTrigger>
            <TooltipContent side="right" className="lg:hidden">
              Profile
            </TooltipContent>
          </Tooltip>
        </nav>
      </aside>
    </TooltipProvider>
  );
}
