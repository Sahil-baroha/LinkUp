/**
 * connections.ts — Connection API functions
 *
 * Source verified against:
 *   - routes/connection.routes.js
 *   - controllers/connection.controller.js
 *   - services/connection.service.js
 *       → getMyConnections transforms to { connectionId, user, connectedAt }[]
 *       → sendRequest returns raw Connection document (unpopulated)
 *       → acceptRequest/rejectRequest return raw Connection document
 *       → withdrawRequest/removeConnection return { message } string
 */

import apiClient from "./client";
import type { ApiResponse } from "@/types";
import type {
  AcceptedConnection,
  IncomingRequest,
  SentRequest,
  Connection,
} from "@/types";

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * GET /connections
 * Returns accepted connections for the current user.
 * Each item is transformed: { connectionId, user, connectedAt }
 * where `user` is always the OTHER party (not the current user).
 */
export async function getConnections(): Promise<AcceptedConnection[]> {
  const res = await apiClient.get<ApiResponse<AcceptedConnection[]>>(
    "/connections"
  );
  return res.data.data;
}

/**
 * GET /connections/requests
 * Returns pending incoming requests where the current user is the receiver.
 * senderId is populated: { _id, name, username, profilePicture }
 */
export async function getIncomingRequests(): Promise<IncomingRequest[]> {
  const res = await apiClient.get<ApiResponse<IncomingRequest[]>>(
    "/connections/requests"
  );
  return res.data.data;
}

/**
 * GET /connections/sent
 * Returns pending outgoing requests sent by the current user.
 * receiverId is populated: { _id, name, username, profilePicture }
 */
export async function getSentRequests(): Promise<SentRequest[]> {
  const res = await apiClient.get<ApiResponse<SentRequest[]>>(
    "/connections/sent"
  );
  return res.data.data;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * POST /connections/request/:userId
 * Sends a connection request to a user.
 * Returns the raw new Connection document (senderId/receiverId are ObjectId strings).
 */
export async function sendRequest(userId: string): Promise<Connection> {
  const res = await apiClient.post<ApiResponse<Connection>>(
    `/connections/request/${userId}`
  );
  return res.data.data;
}

/**
 * PATCH /connections/accept/:requestId
 * Accepts an incoming connection request. Only the receiver can accept.
 * Returns the updated Connection document (status → "accepted").
 */
export async function acceptRequest(requestId: string): Promise<Connection> {
  const res = await apiClient.patch<ApiResponse<Connection>>(
    `/connections/accept/${requestId}`
  );
  return res.data.data;
}

/**
 * PATCH /connections/reject/:requestId
 * Rejects an incoming connection request. Only the receiver can reject.
 * Returns the updated Connection document (status → "rejected").
 */
export async function rejectRequest(requestId: string): Promise<Connection> {
  const res = await apiClient.patch<ApiResponse<Connection>>(
    `/connections/reject/${requestId}`
  );
  return res.data.data;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * DELETE /connections/withdraw/:requestId
 * Withdraws an outgoing pending request. Only the sender can withdraw.
 * Returns void — backend responds with { message } which we discard.
 */
export async function withdrawRequest(requestId: string): Promise<void> {
  await apiClient.delete(`/connections/withdraw/${requestId}`);
}

/**
 * DELETE /connections/remove/:userId
 * Removes an accepted connection with another user.
 * Returns void — backend responds with { message } which we discard.
 */
export async function removeConnection(userId: string): Promise<void> {
  await apiClient.delete(`/connections/remove/${userId}`);
}
