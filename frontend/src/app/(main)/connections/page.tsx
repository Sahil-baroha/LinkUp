"use client";

/**
 * (main)/connections/page.tsx — Connections Hub
 *
 * Requirements:
 *   - PageHeader
 *   - Tabs: Connections / Requests (count badge) / Sent honoring ?tab= query param
 *   - Rows with UserAvatar, name link, headline, relative date
 *   - Requests: Accept and Reject
 *   - Sent: Withdraw
 *   - Connections: Remove behind a confirm dialog
 *   - Empty state per tab with guidance
 *   - "People you may know" section (useSuggestions(10)) with ConnectButton
 */

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users, UserCheck, Send, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  useConnections,
  useIncomingRequests,
  useSentRequests,
} from "@/hooks/use-connections";
import { useSuggestions } from "@/hooks/use-user";
import { ConnectionCard } from "@/components/features/connections/connection-card";
import { RequestCard } from "@/components/features/connections/request-card";
import { SentCard } from "@/components/features/connections/sent-card";
import { ConnectButton } from "@/components/features/connections/connect-button";
import {
  FullPageSpinner,
  EmptyState,
  Spinner,
  PageHeader,
  UserAvatar,
  Card,
} from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tab = "connections" | "requests" | "sent";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "connections", label: "Connections", icon: Users },
  { key: "requests", label: "Requests", icon: UserCheck },
  { key: "sent", label: "Sent", icon: Send },
];

function ConnectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Sync active tab with URL query parameter ?tab=
  const tabParam = searchParams.get("tab");
  const activeTab: Tab =
    tabParam === "requests" || tabParam === "sent" || tabParam === "connections"
      ? tabParam
      : "connections";

  function handleTabChange(tab: Tab) {
    router.replace(`/connections?tab=${tab}`, { scroll: false });
  }

  useEffect(() => {
    if (_hasHydrated && !user) router.replace("/login");
  }, [_hasHydrated, user, router]);

  const { data: connections, isLoading: loadingConn } = useConnections();
  const { data: incoming, isLoading: loadingReq } = useIncomingRequests();
  const { data: sent, isLoading: loadingSent } = useSentRequests();
  const {
    data: suggestions,
    isLoading: loadingSuggestions,
    isError: suggestionsError,
  } = useSuggestions(10);

  if (!_hasHydrated) return <FullPageSpinner />;
  if (!user) return null;

  const counts: Record<Tab, number> = {
    connections: connections?.length ?? 0,
    requests: incoming?.length ?? 0,
    sent: sent?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <PageHeader
        title="Network"
        description="Manage your professional connections and invitations"
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200/50 bg-white p-1 shadow-xs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors cursor-pointer",
              activeTab === key
                ? "bg-[#0f172a] text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <Icon size={15} strokeWidth={1.5} />
            <span>{label}</span>
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

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === "connections" && (
          <TabContent
            isLoading={loadingConn}
            empty={!connections?.length}
            emptyProps={{
              icon: Users,
              title: "No connections yet",
              description:
                "Connect with professionals to expand your network and see their updates.",
            }}
          >
            {connections?.map((c) => (
              <ConnectionCard key={c.connectionId} connection={c} />
            ))}
          </TabContent>
        )}

        {activeTab === "requests" && (
          <TabContent
            isLoading={loadingReq}
            empty={!incoming?.length}
            emptyProps={{
              icon: UserCheck,
              title: "No pending requests",
              description:
                "You have no incoming connection requests at the moment.",
            }}
          >
            {incoming?.map((r) => (
              <RequestCard key={r._id} request={r} />
            ))}
          </TabContent>
        )}

        {activeTab === "sent" && (
          <TabContent
            isLoading={loadingSent}
            empty={!sent?.length}
            emptyProps={{
              icon: Send,
              title: "No sent requests",
              description:
                "You haven't sent any pending connection requests.",
            }}
          >
            {sent?.map((r) => (
              <SentCard key={r._id} request={r} />
            ))}
          </TabContent>
        )}
      </div>

      {/* People you may know */}
      <div className="pt-4">
        {loadingSuggestions ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                People you may know
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-2.5 w-36" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-20 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </Card>
        ) : !suggestionsError && suggestions && suggestions.length > 0 ? (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                People you may know
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((s) => {
                const displayName = s.name || s.username;
                return (
                  <div
                    key={s._id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200/50 bg-white hover:border-slate-300/70 transition-colors"
                  >
                    <Link
                      href={`/profile/${s._id}`}
                      className="flex items-center gap-2.5 min-w-0 flex-1"
                    >
                      <UserAvatar
                        src={s.profilePicture}
                        name={displayName}
                        size="md"
                        seed={s._id}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 hover:underline">
                          {displayName}
                        </p>
                        {s.headline && (
                          <p className="truncate text-[11px] text-slate-500">
                            {s.headline}
                          </p>
                        )}
                        {s.mutualCount > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {s.mutualCount} mutual connection
                            {s.mutualCount > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </Link>

                    <div className="shrink-0">
                      <ConnectButton userId={s._id} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ConnectionsContent />
    </Suspense>
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
