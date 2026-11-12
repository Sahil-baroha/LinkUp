"use client";

/**
 * sent-card.tsx — Outgoing connection request card
 *
 * Requirements:
 *   - UserAvatar, name link to profile, headline, relative date
 *   - Withdraw button
 */

import Link from "next/link";
import { UserX } from "lucide-react";
import { toast } from "sonner";
import { useWithdrawRequest } from "@/hooks/use-connections";
import { UserAvatar } from "@/components/shared";
import { Spinner } from "@/components/shared/spinner";
import { formatRelativeTime } from "@/lib/utils";
import type { SentRequest } from "@/types";

interface SentCardProps {
  request: SentRequest;
}

export function SentCard({ request }: SentCardProps) {
  const withdrawMutation = useWithdrawRequest();
  const displayName = request.receiverId.name || request.receiverId.username;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white p-4 transition-shadow hover:shadow-xs">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href={`/profile/${request.receiverId._id}`} className="shrink-0">
          <UserAvatar
            src={request.receiverId.profilePicture}
            name={displayName}
            size="md"
            seed={request.receiverId._id}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${request.receiverId._id}`}
            className="block truncate text-sm font-semibold text-slate-900 hover:underline hover:underline-offset-2 transition-colors"
          >
            {displayName}
          </Link>
          {request.receiverId.headline && (
            <p className="truncate text-xs text-slate-500">
              {request.receiverId.headline}
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-0.5">
            Sent {formatRelativeTime(request.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          withdrawMutation.mutate(request._id, {
            onSuccess: () => toast.success("Request withdrawn"),
            onError: (err: unknown) => {
              const message =
                (err as { response?: { data?: { message?: string } } })?.response
                  ?.data?.message || "Failed to withdraw request";
              toast.error(message);
            },
          })
        }
        disabled={withdrawMutation.isPending}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {withdrawMutation.isPending ? (
          <Spinner size="sm" />
        ) : (
          <UserX size={13} strokeWidth={1.5} />
        )}
        Withdraw
      </button>
    </div>
  );
}
