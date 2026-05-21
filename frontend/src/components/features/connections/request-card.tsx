"use client";

/**
 * request-card.tsx — Incoming connection request card
 *
 * Props: request: IncomingRequest
 * Accept → optimistic exit animation before server confirms
 * Reject → standard mutation + server response
 */

import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAcceptRequest, useRejectRequest } from "@/hooks/use-connections";
import { UserMeta } from "@/components/shared/user-meta";
import { Spinner } from "@/components/shared/spinner";
import type { IncomingRequest } from "@/types";

interface RequestCardProps {
  request: IncomingRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  const acceptMutation = useAcceptRequest();
  const rejectMutation = useRejectRequest();

  const anyPending = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <motion.div
      layout
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white p-4">
        <UserMeta
          user={request.senderId}
          timestamp={request.createdAt}
          size="md"
        />

        <div className="flex shrink-0 items-center gap-2 ml-3">
          {/* Accept */}
          <button
            onClick={() =>
              acceptMutation.mutate(request._id, {
                onSuccess: () => toast.success("Connection accepted"),
                onError: () => toast.error("Failed to accept request"),
              })
            }
            disabled={anyPending}
            className="flex items-center gap-1.5 rounded-lg bg-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {acceptMutation.isPending && <Spinner size="sm" />}
            Accept
          </button>

          {/* Reject */}
          <button
            onClick={() =>
              rejectMutation.mutate(request._id, {
                onError: () => toast.error("Failed to reject request"),
              })
            }
            disabled={anyPending}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {rejectMutation.isPending && <Spinner size="sm" />}
            Decline
          </button>
        </div>
      </div>
    </motion.div>
  );
}
