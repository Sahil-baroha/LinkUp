"use client";

/**
 * profile-header.tsx — User profile cover + avatar + info + connection action
 *
 * Props: user, isOwnProfile
 * Cover: deterministic gradient seeded from user._id via generateAvatarColor
 * Avatar: xl, positioned overlapping cover bottom edge
 * Connection states: none, sent, received, connected (read from useConnections hooks)
 */

import { useState } from "react";
import { Calendar } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import {
  useConnections,
  useIncomingRequests,
  useSentRequests,
  useSendRequest,
  useWithdrawRequest,
  useAcceptRequest,
  useRejectRequest,
  useRemoveConnection,
} from "@/hooks/use-connections";
import { Avatar } from "@/components/shared/avatar";
import { Spinner } from "@/components/shared/spinner";
import { EditProfileModal } from "./edit-profile-modal";
import { formatRelativeTime, generateAvatarColor, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User } from "@/types";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
}

// Cover gradient map from generateAvatarColor palette
const COVER_GRADIENTS: Record<string, string> = {
  "bg-indigo-100": "from-indigo-100 to-indigo-200",
  "bg-slate-100":  "from-slate-100 to-slate-200",
  "bg-violet-100": "from-violet-100 to-violet-200",
  "bg-blue-100":   "from-blue-100 to-blue-200",
  "bg-sky-100":    "from-sky-100 to-sky-200",
};

export function ProfileHeader({ user, isOwnProfile }: ProfileHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const colors = generateAvatarColor(user._id);
  const coverGradient = COVER_GRADIENTS[colors.bg] ?? "from-slate-100 to-slate-200";

  return (
    <div className="relative overflow-visible rounded-xl border border-slate-200/50 bg-white">
      {/* Cover area */}
      <div
        className={cn(
          "h-40 rounded-t-xl bg-gradient-to-br",
          coverGradient
        )}
      />

      {/* Overlapping avatar */}
      <div className="absolute left-6 top-[100px]">
        <div className="rounded-full ring-4 ring-white">
          <Avatar
            src={user.profilePicture}
            name={user.name}
            size="xl"
            seed={user._id}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="px-6 pb-6 pt-14">
        <div className="flex items-start justify-between">
          {/* User info */}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">{user.name}</h1>
            <p className="text-sm text-slate-400">@{user.username}</p>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Calendar size={14} strokeWidth={1.5} />
              <span>Joined {formatRelativeTime(user.createdAt)}</span>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-1">
            {isOwnProfile ? (
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <ConnectionActionButton userId={user._id} />
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal open={editOpen} onOpenChange={setEditOpen} user={user} />
    </div>
  );
}

// ─── Inline sub-component ─────────────────────────────────────────────────────

function ConnectionActionButton({ userId }: { userId: string }) {
  const { data: connections } = useConnections();
  const { data: incoming } = useIncomingRequests();
  const { data: sent } = useSentRequests();

  const sendMutation = useSendRequest();
  const withdrawMutation = useWithdrawRequest();
  const acceptMutation = useAcceptRequest();
  const rejectMutation = useRejectRequest();
  const removeMutation = useRemoveConnection();

  const anyPending =
    sendMutation.isPending ||
    withdrawMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    removeMutation.isPending;

  // Determine connection state
  const connected = connections?.find((c) => c.user._id === userId);
  const sentRequest = sent?.find((r) => r.receiverId._id === userId);
  const receivedRequest = incoming?.find((r) => r.senderId._id === userId);

  if (connected) {
    return (
      <button
        onClick={() =>
          removeMutation.mutate(userId, {
            onSuccess: () => toast.success("Connection removed"),
          })
        }
        disabled={anyPending}
        className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50"
      >
        {removeMutation.isPending && <Spinner size="sm" />}
        Remove Connection
      </button>
    );
  }

  if (receivedRequest) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() =>
            acceptMutation.mutate(receivedRequest._id, {
              onSuccess: () => toast.success("Connection accepted"),
            })
          }
          disabled={anyPending}
          className="flex items-center gap-2 rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {acceptMutation.isPending && <Spinner size="sm" />}
          Accept
        </button>
        <button
          onClick={() => rejectMutation.mutate(receivedRequest._id)}
          disabled={anyPending}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    );
  }

  if (sentRequest) {
    return (
      <button
        onClick={() =>
          withdrawMutation.mutate(sentRequest._id, {
            onSuccess: () => toast.success("Request withdrawn"),
          })
        }
        disabled={anyPending}
        className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        {withdrawMutation.isPending && <Spinner size="sm" />}
        Withdraw
      </button>
    );
  }

  return (
    <button
      onClick={() =>
        sendMutation.mutate(userId, {
          onSuccess: () => toast.success("Connection request sent"),
          onError: () => toast.error("Failed to send request"),
        })
      }
      disabled={anyPending}
      className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {sendMutation.isPending && <Spinner size="sm" />}
      Connect
    </button>
  );
}
