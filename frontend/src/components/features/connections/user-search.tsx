"use client";

/**
 * user-search.tsx — Debounced search with dropdown results
 *
 * Props: className (for positioning within TopNavbar)
 * 
 * Dropdown: GlassCard treatment, absolute positioned, z-50
 * Focus management: 150ms blur timeout so dropdown click events fire before close
 * ConnectButton state: derived from connections/sent/incoming lists
 */

import { useState, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import {
  useConnections,
  useIncomingRequests,
  useSentRequests,
  useSendRequest,
} from "@/hooks/use-connections";
import { Avatar } from "@/components/shared/avatar";
import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

interface UserSearchProps {
  className?: string;
}

export function UserSearch({ className }: UserSearchProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const { results, isLoading, debouncedQuery } = useSearch(rawQuery);
  const showDropdown = focused && (results.length > 0 || isLoading || debouncedQuery.length > 0);

  function handleFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setFocused(true);
  }

  function handleBlur() {
    blurTimeoutRef.current = setTimeout(() => setFocused(false), 150);
  }

  function handleSelect() {
    setRawQuery("");
    setFocused(false);
  }

  return (
    <div className={cn("relative", className)}>
      {/* Search input */}
      <div className="relative">
        <Search
          size={15}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search for people..."
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-slate-50",
            "pl-9 pr-4 py-2 text-sm text-slate-700",
            "placeholder:text-slate-400",
            "focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100",
            "transition-all"
          )}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-1 w-full z-50 overflow-hidden rounded-xl border border-slate-200/50 bg-white/90 backdrop-blur-md shadow-[0_0_40px_0_rgba(15,23,42,0.08)]">
          {isLoading && debouncedQuery.length > 0 ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : results.length === 0 && debouncedQuery.length > 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          ) : (
            <ul>
              {results.map((user) => (
                <UserSearchResultItem
                  key={user._id}
                  user={user}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline sub-component ─────────────────────────────────────────────────────

function UserSearchResultItem({
  user,
  onSelect,
}: {
  user: User;
  onSelect: () => void;
}) {
  const { data: connections } = useConnections();
  const { data: sent } = useSentRequests();
  const { data: incoming } = useIncomingRequests();
  const sendMutation = useSendRequest();

  const isConnected = connections?.some((c) => c.user._id === user._id);
  const hasSent = sent?.some((r) => r.receiverId._id === user._id);
  const hasReceived = incoming?.some((r) => r.senderId._id === user._id);

  return (
    <li className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
      <Link
        href={`/profile/${user._id}`}
        onClick={onSelect}
        className="flex items-center gap-2.5 min-w-0"
      >
        <Avatar
          src={user.profilePicture}
          name={user.name}
          size="sm"
          seed={user._id}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-400">@{user.username}</p>
        </div>
      </Link>

      {/* Connect status button */}
      <ConnectStatusButton
        userId={user._id}
        isConnected={isConnected}
        hasSent={hasSent}
        hasReceived={hasReceived}
        onConnect={() => sendMutation.mutate(user._id)}
        isPending={sendMutation.isPending}
      />
    </li>
  );
}

function ConnectStatusButton({
  userId,
  isConnected,
  hasSent,
  hasReceived,
  onConnect,
  isPending,
}: {
  userId: string;
  isConnected?: boolean;
  hasSent?: boolean;
  hasReceived?: boolean;
  onConnect: () => void;
  isPending: boolean;
}) {
  if (isConnected) {
    return (
      <span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
        Connected
      </span>
    );
  }
  if (hasSent) {
    return (
      <span className="ml-2 shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-400">
        Pending
      </span>
    );
  }
  if (hasReceived) {
    return (
      <span className="ml-2 shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-600">
        Respond
      </span>
    );
  }
  return (
    <button
      onClick={(e) => { e.preventDefault(); onConnect(); }}
      disabled={isPending}
      className="ml-2 shrink-0 flex items-center gap-1 rounded-full bg-[#0f172a] px-3 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {isPending && <Spinner size="sm" />}
      Connect
    </button>
  );
}
