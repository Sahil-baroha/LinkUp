"use client";

/**
 * sent-card.tsx — Outgoing connection request card
 *
 * Props: request: SentRequest
 * Withdraw → optimistic exit animation on success
 */

import { motion } from "framer-motion";
import { UserX } from "lucide-react";
import { toast } from "sonner";
import { useWithdrawRequest } from "@/hooks/use-connections";
import { UserMeta } from "@/components/shared/user-meta";
import { Spinner } from "@/components/shared/spinner";
import type { SentRequest } from "@/types";

interface SentCardProps {
  request: SentRequest;
}

export function SentCard({ request }: SentCardProps) {
  const withdrawMutation = useWithdrawRequest();

  return (
    <motion.div
      layout
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white p-4">
        <UserMeta
          user={request.receiverId}
          timestamp={request.createdAt}
          size="md"
        />

        <button
          onClick={() =>
            withdrawMutation.mutate(request._id, {
              onSuccess: () => toast.success("Request withdrawn"),
              onError: () => toast.error("Failed to withdraw request"),
            })
          }
          disabled={withdrawMutation.isPending}
          className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {withdrawMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <UserX size={13} strokeWidth={1.5} />
          )}
          Withdraw
        </button>
      </div>
    </motion.div>
  );
}
