"use client";

/**
 * connection-card.tsx — Accepted connection display card
 *
 * Props: connection: AcceptedConnection
 * Message button: disabled with "Coming soon" tooltip
 * Remove button: text-red-500 border-red-200 hover:bg-red-50
 */

import { MessageSquare, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { useRemoveConnection } from "@/hooks/use-connections";
import { UserMeta } from "@/components/shared/user-meta";
import { Spinner } from "@/components/shared/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AcceptedConnection } from "@/types";

interface ConnectionCardProps {
  connection: AcceptedConnection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  const removeMutation = useRemoveConnection();

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200/50 bg-white p-4">
      <UserMeta
        user={connection.user}
        timestamp={connection.connectedAt}
        size="md"
      />

      <div className="flex shrink-0 items-center gap-2 ml-3">
        {/* Message — coming soon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span>
                <button
                  disabled
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
                >
                  <MessageSquare size={13} strokeWidth={1.5} />
                  Message
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Remove */}
        <button
          onClick={() =>
            removeMutation.mutate(connection.user._id, {
              onSuccess: () => toast.success("Connection removed"),
              onError: () => toast.error("Failed to remove connection"),
            })
          }
          disabled={removeMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {removeMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <UserMinus size={13} strokeWidth={1.5} />
          )}
          Remove
        </button>
      </div>
    </div>
  );
}
