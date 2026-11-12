"use client";

/**
 * profile-header.tsx — User profile cover + avatar + info + connection actions
 *
 * Requirements:
 * - Cover band (gradient, no image)
 * - UserAvatar xl
 * - name, headline, location, joined date, actions
 * - Actions based on connection.status:
 *   - self -> "Edit profile" link to /profile/edit
 *   - none -> Connect (useSendRequest)
 *   - pending_sent -> disabled "Pending" + Withdraw (requestId)
 *   - pending_received -> Accept and Decline (requestId)
 *   - connected -> "Connected" + Remove with a confirm dialog
 * - Invalidate user query after each mutation
 */

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useSendRequest,
  useWithdrawRequest,
  useAcceptRequest,
  useRejectRequest,
  useRemoveConnection,
} from "@/hooks/use-connections";
import { UserAvatar } from "@/components/shared";
import { Spinner } from "@/components/shared/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateAvatarColor, formatJoinedDate, cn } from "@/lib/utils";
import type { User } from "@/types";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
}

const COVER_GRADIENTS: Record<string, string> = {
  "bg-indigo-100": "from-indigo-100 to-indigo-200",
  "bg-slate-100":  "from-slate-100 to-slate-200",
  "bg-violet-100": "from-violet-100 to-violet-200",
  "bg-blue-100":   "from-blue-100 to-blue-200",
  "bg-sky-100":    "from-sky-100 to-sky-200",
};

export function ProfileHeader({ user, isOwnProfile }: ProfileHeaderProps) {
  const colors = generateAvatarColor(user._id);
  const coverGradient = COVER_GRADIENTS[colors.bg] ?? "from-slate-100 to-slate-200";

  return (
    <div className="relative overflow-visible rounded-xl border border-slate-200/50 bg-white">
      {/* Cover band (gradient, no image) */}
      <div
        className={cn(
          "h-40 rounded-t-xl bg-gradient-to-br",
          coverGradient
        )}
      />

      {/* Overlapping UserAvatar xl */}
      <div className="absolute left-6 top-[100px]">
        <div className="rounded-full ring-4 ring-white">
          <UserAvatar
            src={user.profilePicture}
            name={user.name}
            size="xl"
            seed={user._id}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="px-6 pb-6 pt-14">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* User info */}
          <div className="space-y-1.5 min-w-0">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 truncate">{user.name}</h1>
              <p className="text-sm text-slate-400 truncate">@{user.username}</p>
            </div>

            {user.headline && (
              <p className="text-sm text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                {user.headline}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Joined {formatJoinedDate(user.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action slot */}
          <div className="shrink-0 mt-1 sm:mt-0">
            {isOwnProfile ? (
              <Link
                href="/profile/edit"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Edit profile
              </Link>
            ) : (
              <ConnectionActions user={user} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Connection actions sub-component ─────────────────────────────────────────

function ConnectionActions({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const sendMutation = useSendRequest();
  const withdrawMutation = useWithdrawRequest();
  const acceptMutation = useAcceptRequest();
  const rejectMutation = useRejectRequest();
  const removeMutation = useRemoveConnection();

  const isMutating =
    sendMutation.isPending ||
    withdrawMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    removeMutation.isPending;

  const status = user.connection?.status ?? "none";
  const requestId = user.connection?.requestId;

  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: ["users", user._id] });
  };

  // 1. Connected
  if (status === "connected") {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
          <Check size={14} className="text-emerald-600" />
          Connected
        </span>
        <button
          onClick={() => setRemoveDialogOpen(true)}
          disabled={isMutating}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
        >
          Remove
        </button>

        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Connection</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {user.name} from your connections?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveDialogOpen(false)}
                disabled={removeMutation.isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  removeMutation.mutate(user._id, {
                    onSuccess: () => {
                      toast.success("Connection removed");
                      invalidateUser();
                      setRemoveDialogOpen(false);
                    },
                    onError: () => toast.error("Failed to remove connection"),
                  });
                }}
                disabled={removeMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {removeMutation.isPending && <Spinner size="sm" />}
                Confirm Remove
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 2. Pending Sent (waiting for target response)
  if (status === "pending_sent") {
    return (
      <div className="flex items-center gap-2">
        <button
          disabled
          className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-medium text-slate-400 cursor-not-allowed"
        >
          Pending
        </button>
        {requestId && (
          <button
            onClick={() => {
              withdrawMutation.mutate(requestId, {
                onSuccess: () => {
                  toast.success("Request withdrawn");
                  invalidateUser();
                },
                onError: () => toast.error("Failed to withdraw request"),
              });
            }}
            disabled={isMutating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {withdrawMutation.isPending && <Spinner size="sm" />}
            Withdraw
          </button>
        )}
      </div>
    );
  }

  // 3. Pending Received (waiting for current user response)
  if (status === "pending_received") {
    return (
      <div className="flex items-center gap-2">
        {requestId && (
          <>
            <button
              onClick={() => {
                acceptMutation.mutate(requestId, {
                  onSuccess: () => {
                    toast.success("Connection accepted");
                    invalidateUser();
                  },
                  onError: () => toast.error("Failed to accept connection"),
                });
              }}
              disabled={isMutating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {acceptMutation.isPending && <Spinner size="sm" />}
              Accept
            </button>
            <button
              onClick={() => {
                rejectMutation.mutate(requestId, {
                  onSuccess: () => {
                    toast.success("Request declined");
                    invalidateUser();
                  },
                  onError: () => toast.error("Failed to decline request"),
                });
              }}
              disabled={isMutating}
              className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </>
        )}
      </div>
    );
  }

  // 4. None (no relationship)
  return (
    <button
      onClick={() => {
        sendMutation.mutate(user._id, {
          onSuccess: () => {
            toast.success("Connection request sent");
            invalidateUser();
          },
          onError: () => toast.error("Failed to send request"),
        });
      }}
      disabled={isMutating}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {sendMutation.isPending && <Spinner size="sm" />}
      Connect
    </button>
  );
}
