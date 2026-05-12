/**
 * connection.ts — Connection types
 *
 * Source verified against:
 *   - models/connections.model.js
 *   - repositories/connection.repository.js
 *       → getAcceptedConnections() populates BOTH senderId and receiverId
 *         with "name username profilePicture"
 *       → getIncomingRequests()  populates senderId  with "name username profilePicture"
 *       → getOutgoingRequests()  populates receiverId with "name username profilePicture"
 *       → findById(), create(), updateStatus() return raw (unpopulated) documents
 *   - services/connection.service.js → getMyConnections() transforms raw docs into
 *         { connectionId, user, connectedAt } where `user` is the "other party"
 *
 * IMPORTANT: The other LLM's plan described "AcceptedConnection" with a nested
 * `user` shape — this is CORRECT. The service transforms the raw populated document
 * into this shape so the caller always gets "the other user" regardless of whether
 * the current user was sender or receiver.
 */

import type { ConnectionUser } from "./user";

// ─── Connection status ──────────────────────────────────────────────────────

export type ConnectionStatus = "pending" | "accepted" | "rejected";

// ─── Raw connection document ────────────────────────────────────────────────

/**
 * Raw connection document as returned by mutation endpoints:
 *   - POST   /connections/request/:userId  → sendRequest returns new doc (unpopulated)
 *   - PATCH  /connections/accept/:requestId → acceptRequest returns updated doc
 *   - PATCH  /connections/reject/:requestId → rejectRequest returns updated doc
 *
 * senderId and receiverId are raw ObjectId strings (not populated by these paths).
 * Source: connection.repository.js → create(), updateStatus() do NOT populate.
 */
export interface Connection {
  _id: string;
  senderId: string;   // Raw ObjectId string
  receiverId: string; // Raw ObjectId string
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Accepted connections (GET /connections) ────────────────────────────────

/**
 * Transformed accepted connection as returned by GET /connections.
 * Source: connection.service.js → getMyConnections() maps each raw doc:
 *   {
 *     connectionId: conn._id,
 *     user: isSender ? conn.receiverId : conn.senderId,  // the "other" party
 *     connectedAt: conn.updatedAt,
 *   }
 *
 * `user` uses ConnectionUser projection: { _id, name, username, profilePicture }
 * `connectedAt` = updatedAt from the connection doc (when status changed to "accepted")
 */
export interface AcceptedConnection {
  connectionId: string;
  user: ConnectionUser;
  connectedAt: string; // ISO 8601 — maps to connection.updatedAt
}

// ─── Incoming requests (GET /connections/requests) ─────────────────────────

/**
 * An incoming pending connection request as returned by GET /connections/requests.
 * Source: connection.repository.js → getIncomingRequests()
 *   - populate("senderId", "name username profilePicture")
 *   - receiverId is NOT populated (current user — they know who they are)
 *   - status is always "pending"
 */
export interface IncomingRequest {
  _id: string;
  senderId: ConnectionUser; // Populated
  receiverId: string;       // Raw ObjectId — the current authenticated user
  status: "pending";
  createdAt: string;
  updatedAt: string;
}

// ─── Outgoing requests (GET /connections/sent) ─────────────────────────────

/**
 * An outgoing pending connection request as returned by GET /connections/sent.
 * Source: connection.repository.js → getOutgoingRequests()
 *   - populate("receiverId", "name username profilePicture")
 *   - senderId is NOT populated (current user)
 *   - status is always "pending"
 */
export interface SentRequest {
  _id: string;
  senderId: string;           // Raw ObjectId — the current authenticated user
  receiverId: ConnectionUser; // Populated
  status: "pending";
  createdAt: string;
  updatedAt: string;
}
