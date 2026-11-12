"use client";

/**
 * user-search.tsx — Debounced search with dropdown results for top navbar
 *
 * Requirements:
 *   - Debounced input (300ms)
 *   - "Type at least 2 characters" hint when length === 1
 *   - Dropdown of up to 8 results (UserAvatar, name link to profile, headline, compact ConnectButton)
 *   - Loading skeleton (3-4 items)
 *   - "No people found" when 0 results
 *   - Closes on outside click and Escape
 *   - 429 inline: "Too many searches, try again in N seconds" (read Retry-After)
 *   - Other errors inline message
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { UserAvatar } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectButton } from "./connect-button";
import { cn } from "@/lib/utils";

interface UserSearchProps {
  className?: string;
  onSelect?: () => void;
  autoFocus?: boolean;
}

export function UserSearch({
  className,
  onSelect,
  autoFocus = false,
}: UserSearchProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = rawQuery.trim();
  const { results, isLoading, isError, error } = useSearch(rawQuery, 1, 8);

  const showHint = trimmed.length === 1;
  const showDropdown = isOpen && (trimmed.length > 0 || isLoading);

  // Focus input if autoFocus prop is passed
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Handle outside click and Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSelect() {
    setIsOpen(false);
    setRawQuery("");
    onSelect?.();
  }

  // Parse 429 Retry-After header or general error message
  const errorMessage = (() => {
    if (!isError || !error) return null;
    const axiosError = error as {
      response?: {
        status?: number;
        headers?: Record<string, string | number | undefined>;
        data?: { message?: string };
      };
    };

    if (axiosError.response?.status === 429) {
      const headers = axiosError.response?.headers;
      const retryHeader =
        headers?.["retry-after"] ?? headers?.["Retry-After"];
      const seconds = parseInt(String(retryHeader), 10);
      if (Number.isFinite(seconds) && seconds > 0) {
        return `Too many searches, try again in ${seconds} seconds`;
      }
      return "Too many searches, try again in a few seconds";
    }

    return (
      axiosError.response?.data?.message || "Search failed. Please try again."
    );
  })();

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search
          size={16}
          strokeWidth={1.5}
          className="absolute left-3 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={rawQuery}
          onChange={(e) => {
            setRawQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for people..."
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-slate-50",
            "pl-9 pr-8 py-2 text-sm text-slate-800",
            "placeholder:text-slate-400",
            "focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100",
            "transition-all"
          )}
        />
        {rawQuery.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setRawQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X size={12} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Dropdown menu */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 overflow-hidden rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-md shadow-lg">
          {/* Hint: 1 character */}
          {showHint && (
            <p className="px-4 py-3 text-xs text-slate-500">
              Type at least 2 characters to search
            </p>
          )}

          {/* Error message (e.g. 429 rate limit) */}
          {trimmed.length >= 2 && errorMessage && (
            <p className="px-4 py-3 text-xs text-amber-600 bg-amber-50/50">
              {errorMessage}
            </p>
          )}

          {/* Loading skeletons */}
          {trimmed.length >= 2 && isLoading && !errorMessage && (
            <div className="p-2 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-40" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state: No people found */}
          {trimmed.length >= 2 &&
            !isLoading &&
            !errorMessage &&
            results.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-400">
                No people found
              </p>
            )}

          {/* Results list */}
          {trimmed.length >= 2 &&
            !isLoading &&
            !errorMessage &&
            results.length > 0 && (
              <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {results.map((user) => {
                  const displayName = user.name || user.username;
                  return (
                    <li
                      key={user._id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <Link
                        href={`/profile/${user._id}`}
                        onClick={handleSelect}
                        className="flex items-center gap-2.5 min-w-0 flex-1"
                      >
                        <UserAvatar
                          src={user.profilePicture}
                          name={displayName}
                          size="sm"
                          seed={user._id}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900 hover:underline">
                            {displayName}
                          </p>
                          {user.headline && (
                            <p className="truncate text-[11px] text-slate-400">
                              {user.headline}
                            </p>
                          )}
                        </div>
                      </Link>

                      <div className="shrink-0">
                        <ConnectButton
                          userId={user._id}
                          connection={user.connection}
                          size="sm"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
        </div>
      )}
    </div>
  );
}
