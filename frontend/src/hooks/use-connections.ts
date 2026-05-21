/**
 * use-connections.ts — Connection queries and mutations
 *
 * Three independent query namespaces:
 *   ['connections']           — accepted connections (GET /connections)
 *   ['connections', 'requests'] — incoming pending (GET /connections/requests)
 *   ['connections', 'sent']   — outgoing pending (GET /connections/sent)
 *
 * Invalidation matrix (explicit per mutation):
 *   sendRequest    → ['connections', 'sent']
 *   withdrawRequest → ['connections', 'sent']
 *   acceptRequest  → ['connections'], ['connections', 'requests']
 *   rejectRequest  → ['connections', 'requests']
 *   removeConnection → ['connections']
 *
 * No toasts in this hook — components handle user feedback.
 * isPending is exposed on every mutation for loading UI state.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getConnections,
  getIncomingRequests,
  getSentRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  withdrawRequest,
  removeConnection,
} from "@/lib/api";

// ─── Query key constants ──────────────────────────────────────────────────────

export const CONNECTIONS_KEY = ["connections"] as const;
export const INCOMING_REQUESTS_KEY = ["connections", "requests"] as const;
export const SENT_REQUESTS_KEY = ["connections", "sent"] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useConnections() {
  return useQuery({
    queryKey: CONNECTIONS_KEY,
    queryFn: getConnections,
  });
}

export function useIncomingRequests() {
  return useQuery({
    queryKey: INCOMING_REQUESTS_KEY,
    queryFn: getIncomingRequests,
  });
}

export function useSentRequests() {
  return useQuery({
    queryKey: SENT_REQUESTS_KEY,
    queryFn: getSentRequests,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useSendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => sendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SENT_REQUESTS_KEY });
    },
  });
}

export function useWithdrawRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => withdrawRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SENT_REQUESTS_KEY });
    },
  });
}

export function useAcceptRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => acceptRequest(requestId),
    onSuccess: () => {
      // Accepting moves a request from incoming → accepted connections
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: INCOMING_REQUESTS_KEY });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCOMING_REQUESTS_KEY });
    },
  });
}

export function useRemoveConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeConnection(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
    },
  });
}
