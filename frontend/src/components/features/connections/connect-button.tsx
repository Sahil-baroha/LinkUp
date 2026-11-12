"use client";

/**
 * connect-button.tsx — Shared ConnectButton component
 *
 * Requirements:
 *   - Props: { userId, connection?, size?: "sm" | "md", className?: string }
 *   - none: Connect button (calls sendRequest)
 *   - pending_sent: disabled "Pending"
 *   - pending_received: Accept and Decline buttons (calls acceptRequest / rejectRequest)
 *   - connected: "Connected" label
 *   - Invalidates: search, suggestions, connections, and ['user', id] queries
 */

import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useSendRequest,
  useAcceptRequest,
  useRejectRequest,
  CONNECTIONS_KEY,
  INCOMING_REQUESTS_KEY,
  SENT_REQUESTS_KEY,
} from "@/hooks/use-connections";
import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/utils";
import type { RelationshipStatus, ConnectionRelationship } from "@/types";

export interface ConnectButtonProps {
  userId: string;
  connection?: ConnectionRelationship | { status: RelationshipStatus; requestId: string | null };
  size?: "sm" | "md";
  className?: string;
}

export function ConnectButton({
  userId,
  connection,
  size = "md",
  className,
}: ConnectButtonProps) {
  const queryClient = useQueryClient();
  const [prevPropStatus, setPrevPropStatus] = useState(connection?.status);
  const [localStatus, setLocalStatus] = useState<RelationshipStatus | null>(null);

  // Sync local status during render if connection prop changes (React pattern: adjusting state when props change)
  if (connection?.status !== prevPropStatus) {
    setPrevPropStatus(connection?.status);
    setLocalStatus(null);
  }

  const sendMutation = useSendRequest();
  const acceptMutation = useAcceptRequest();
  const rejectMutation = useRejectRequest();

  const status = localStatus ?? connection?.status ?? "none";
  const requestId = connection?.requestId ?? null;

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    queryClient.invalidateQueries({ queryKey: INCOMING_REQUESTS_KEY });
    queryClient.invalidateQueries({ queryKey: SENT_REQUESTS_KEY });
    queryClient.invalidateQueries({ queryKey: ["users", "suggestions"] });
    queryClient.invalidateQueries({ queryKey: ["users", "search"] });
    queryClient.invalidateQueries({ queryKey: ["users", userId] });
    queryClient.invalidateQueries({ queryKey: ["user", userId] });
  };

  const isPending =
    sendMutation.isPending || acceptMutation.isPending || rejectMutation.isPending;

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1 text-xs"
      : "px-3 py-1.5 text-xs font-medium";

  // 1. Connected — rendered as a label
  if (status === "connected") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600",
          sizeClasses,
          className
        )}
      >
        <Check size={12} className="text-emerald-600" />
        <span>Connected</span>
      </span>
    );
  }

  // 2. Pending sent — disabled indicator
  if (status === "pending_sent") {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed",
          sizeClasses,
          className
        )}
      >
        Pending
      </button>
    );
  }

  // 3. Pending received — Accept and Decline
  if (status === "pending_received") {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <button
          type="button"
          onClick={() => {
            if (!requestId) return;
            acceptMutation.mutate(requestId, {
              onSuccess: () => {
                setLocalStatus("connected");
                toast.success("Connection accepted");
                invalidateQueries();
              },
              onError: (err: unknown) => {
                const message =
                  (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || "Failed to accept request";
                toast.error(message);
              },
            });
          }}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-[#4f46e5] text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
            sizeClasses
          )}
        >
          {acceptMutation.isPending && <Spinner size="sm" />}
          Accept
        </button>
        <button
          type="button"
          onClick={() => {
            if (!requestId) return;
            rejectMutation.mutate(requestId, {
              onSuccess: () => {
                setLocalStatus("none");
                invalidateQueries();
              },
              onError: (err: unknown) => {
                const message =
                  (err as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || "Failed to decline request";
                toast.error(message);
              },
            });
          }}
          disabled={isPending}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
            sizeClasses
          )}
        >
          {rejectMutation.isPending && <Spinner size="sm" />}
          Decline
        </button>
      </div>
    );
  }

  // 4. None — Connect button
  return (
    <button
      type="button"
      onClick={() => {
        sendMutation.mutate(userId, {
          onSuccess: () => {
            setLocalStatus("pending_sent");
            toast.success("Connection request sent");
            invalidateQueries();
          },
          onError: (err: unknown) => {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message || "Failed to send connection request";
            toast.error(message);
          },
        });
      }}
      disabled={isPending}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-indigo-400 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed",
        sizeClasses,
        className
      )}
    >
      {sendMutation.isPending ? (
        <Spinner size="sm" />
      ) : (
        <UserPlus size={12} strokeWidth={1.5} />
      )}
      Connect
    </button>
  );
}
