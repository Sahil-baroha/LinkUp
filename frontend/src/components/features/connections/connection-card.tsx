"use client";

/**
 * connection-card.tsx — Accepted connection row with Remove confirm dialog
 *
 * Requirements:
 *   - UserAvatar, name link to profile, headline, relative date
 *   - Remove behind a confirm dialog
 */

import { useState } from "react";
import Link from "next/link";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useRemoveConnection } from "@/hooks/use-connections";
import { UserAvatar } from "@/components/shared";
import { Spinner } from "@/components/shared/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";
import type { AcceptedConnection } from "@/types";

interface ConnectionCardProps {
  connection: AcceptedConnection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const removeMutation = useRemoveConnection();
  const displayName = connection.user.name || connection.user.username;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white p-4 transition-shadow hover:shadow-xs">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href={`/profile/${connection.user._id}`} className="shrink-0">
            <UserAvatar
              src={connection.user.profilePicture}
              name={displayName}
              size="md"
              seed={connection.user._id}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${connection.user._id}`}
              className="block truncate text-sm font-semibold text-slate-900 hover:underline hover:underline-offset-2 transition-colors"
            >
              {displayName}
            </Link>
            {connection.user.headline && (
              <p className="truncate text-xs text-slate-500">
                {connection.user.headline}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              Connected {formatRelativeTime(connection.connectedAt)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={removeMutation.isPending}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <UserMinus size={13} strokeWidth={1.5} />
          <span>Remove</span>
        </button>
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove connection?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {displayName} from your connections?
              They will no longer see your updates in their feed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                />
              }
            >
              Cancel
            </DialogClose>
            <button
              type="button"
              onClick={() => {
                removeMutation.mutate(connection.user._id, {
                  onSuccess: () => {
                    setConfirmOpen(false);
                    toast.success("Connection removed");
                  },
                  onError: () => toast.error("Failed to remove connection"),
                });
              }}
              disabled={removeMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {removeMutation.isPending && <Spinner size="sm" />}
              Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
