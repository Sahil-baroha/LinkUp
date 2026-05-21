"use client";

/**
 * (main)/connections/page.tsx — Connections hub
 *
 * Three tabs: Connections | Requests | Sent
 * Tab counts shown as badges using Stitch indigo accent.
 * Framer Motion AnimatePresence wraps each list for card exit animations.
 */

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Users, UserCheck, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  useConnections,
  useIncomingRequests,
  useSentRequests,
} from "@/hooks/use-connections";
import { ConnectionCard } from "@/components/features/connections/connection-card";
import { RequestCard } from "@/components/features/connections/request-card";
import { SentCard } from "@/components/features/connections/sent-card";
import { FullPageSpinner, EmptyState, Spinner } from "@/components/shared";
import { cn } from "@/lib/utils";

type Tab = "connections" | "requests" | "sent";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "connections", label: "Connections", icon: Users     },
  { key: "requests",    label: "Requests",    icon: UserCheck },
  { key: "sent",        label: "Sent",        icon: Send      },
];

export default function ConnectionsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [activeTab, setActiveTab] = useState<Tab>("connections");

  useEffect(() => {
    if (_hasHydrated && !user) router.replace("/login");
  }, [_hasHydrated, user, router]);

  const { data: connections, isLoading: loadingConn } = useConnections();
  const { data: incoming,    isLoading: loadingReq  } = useIncomingRequests();
  const { data: sent,        isLoading: loadingSent } = useSentRequests();

  if (!_hasHydrated) return <FullPageSpinner />;
  if (!user) return null;

  const counts: Record<Tab, number> = {
    connections: connections?.length ?? 0,
    requests:    incoming?.length    ?? 0,
    sent:        sent?.length        ?? 0,
  };

  return (
    <div className="space-y-5">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Network</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Manage your professional connections
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200/50 bg-white p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
              activeTab === key
                ? "bg-[#0f172a] text-white"
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Icon size={15} strokeWidth={1.5} />
            <span className="hidden sm:inline">{label}</span>
            {counts[key] > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  activeTab === key
                    ? "bg-white/20 text-white"
                    : "bg-indigo-50 text-indigo-600"
                )}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "connections" && (
        <TabContent isLoading={loadingConn} empty={!connections?.length}
          emptyProps={{ icon: Users, title: "No connections yet",
            description: "Connect with people to grow your network." }}>
          <AnimatePresence initial={false}>
            {connections?.map((c) => (
              <ConnectionCard key={c.connectionId} connection={c} />
            ))}
          </AnimatePresence>
        </TabContent>
      )}

      {activeTab === "requests" && (
        <TabContent isLoading={loadingReq} empty={!incoming?.length}
          emptyProps={{ icon: UserCheck, title: "No pending requests",
            description: "You have no incoming connection requests." }}>
          <AnimatePresence initial={false}>
            {incoming?.map((r) => (
              <RequestCard key={r._id} request={r} />
            ))}
          </AnimatePresence>
        </TabContent>
      )}

      {activeTab === "sent" && (
        <TabContent isLoading={loadingSent} empty={!sent?.length}
          emptyProps={{ icon: Send, title: "No sent requests",
            description: "You haven't sent any connection requests." }}>
          <AnimatePresence initial={false}>
            {sent?.map((r) => (
              <SentCard key={r._id} request={r} />
            ))}
          </AnimatePresence>
        </TabContent>
      )}
    </div>
  );
}

// ─── Shared tab content wrapper ───────────────────────────────────────────────

function TabContent({
  isLoading,
  empty,
  emptyProps,
  children,
}: {
  isLoading: boolean;
  empty: boolean;
  emptyProps: { icon: LucideIcon; title: string; description: string };
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }
  if (empty) {
    return (
      <EmptyState
        icon={emptyProps.icon}
        title={emptyProps.title}
        description={emptyProps.description}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}
