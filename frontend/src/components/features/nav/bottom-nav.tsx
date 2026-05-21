"use client";

/**
 * bottom-nav.tsx — Mobile fixed bottom navigation (visible below md only)
 *
 * Stitch spec: fixed bottom, z-50, glassmorphism border-t
 * 4 icon buttons: Home, Connections, Search, Profile
 * Active icon: text-indigo-600 | Inactive: text-slate-400
 * Search button: sets mobileSearchOpen flag in ui-store (synced with TopNavbar)
 * Connections: badge dot when there are pending incoming requests
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Users, Search, User } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { useIncomingRequests } from "@/hooks/use-connections";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const { data: incomingRequests } = useIncomingRequests();
  const pendingCount = incomingRequests?.length ?? 0;

  if (!user) return null;

  const navItems = [
    { href: "/feed",                  icon: House,  label: "Home"        },
    { href: "/connections",           icon: Users,  label: "Connections", badge: pendingCount > 0 },
    { href: `/profile/${user._id}`,   icon: User,   label: "Profile"     },
  ];

  function isActive(href: string) {
    if (href === "/feed") return pathname === "/feed";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="backdrop-blur-md bg-white/70 border-t border-slate-200/50">
        <div className="grid grid-cols-4 items-center">
          {/* Home */}
          <NavItem href="/feed" icon={House} label="Home" active={isActive("/feed")} />

          {/* Connections with badge dot */}
          <Link
            href="/connections"
            className={cn(
              "relative flex flex-col items-center justify-center py-3 gap-1",
              isActive("/connections") ? "text-indigo-600" : "text-slate-400"
            )}
          >
            <span className="relative">
              <Users size={22} strokeWidth={1.5} />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-600" />
              )}
            </span>
            <span className="text-[10px] font-medium">Network</span>
          </Link>

          {/* Search — controls mobile search in TopNavbar via ui-store */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "flex flex-col items-center justify-center py-3 gap-1",
              sidebarOpen ? "text-indigo-600" : "text-slate-400"
            )}
          >
            <Search size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Search</span>
          </button>

          {/* Profile */}
          <NavItem
            href={`/profile/${user._id}`}
            icon={User}
            label="Profile"
            active={pathname.startsWith("/profile")}
          />
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center py-3 gap-1",
        active ? "text-indigo-600" : "text-slate-400"
      )}
    >
      <Icon size={22} strokeWidth={1.5} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
