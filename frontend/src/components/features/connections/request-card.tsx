"use client";

/**
 * request-card.tsx — Incoming connection request card
 *
 * Requirements:
 *   - UserAvatar, name link to profile, headline, relative date
 *   - Accept and Decline buttons
 */

import Link from "next/link";
import { toast } from "sonner";
import { useAcceptRequest, useRejectRequest } from "@/hooks/use-connections";
import { UserAvatar } from "@/components/shared";
import { Spinner } from "@/components/shared/spinner";
import { formatRelativeTime } from "@/lib/utils";
import type { IncomingRequest } from "@/types";

interface RequestCardProps {
  request: IncomingRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  const acceptMutation = useAcceptRequest();
  const rejectMutation = useRejectRequest();
  const displayName = request.senderId.name || request.senderId.username;

  const anyPending = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white p-4 transition-shadow hover:shadow-xs">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href={`/profile/${request.senderId._id}`} className="shrink-0">
          <UserAvatar
            src={request.senderId.profilePicture}
            name={displayName}
            size="md"
            seed={request.senderId._id}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${request.senderId._id}`}
            className="block truncate text-sm font-semibold text-slate-900 hover:underline hover:underline-offset-2 transition-colors"
          >
            {displayName}
          </Link>
          {request.senderId.headline && (
            <p className="truncate text-xs text-slate-500">
              {request.senderId.headline}
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-0.5">
            Received {formatRelativeTime(request.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() =>
            acceptMutation.mutate(request._id, {
              onSuccess: () => toast.success("Connection accepted"),
              onError: (err: unknown) => {
                const message =
                  (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || "Failed to accept request";
                toast.error(message);
              },
            })
          }
          disabled={anyPending}
          className="flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {acceptMutation.isPending && <Spinner size="sm" />}
          Accept
        </button>

        <button
          type="button"
          onClick={() =>
            rejectMutation.mutate(request._id, {
              onSuccess: () => toast.success("Request declined"),
              onError: (err: unknown) => {
                const message =
                  (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || "Failed to decline request";
                toast.error(message);
              },
            })
          }
          disabled={anyPending}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {rejectMutation.isPending && <Spinner size="sm" />}
          Decline
        </button>
      </div>
    </div>
  );
}
