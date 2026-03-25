import { connectionRepo } from "../repositories/connection.repository.js";
import { userRepo } from "../repositories/user.repository.js";
import {
    BadRequestError,
    NotFoundError,
    ForbiddenError,
    ConflictError,
} from "../utils/errors.js";

export class ConnectionService {

    // ─── READ ────────────────────────────────────────────────────────────────

    /**
     * GET /connections
     * Returns all accepted connections for the current user.
     * Each document is transformed so the "other user" is always at the top level.
     */
    async getMyConnections(userId) {
        const connections = await connectionRepo.getAcceptedConnections(userId);
        return connections.map(conn => {
            const isSender = String(conn.senderId._id) === String(userId);
            return {
                connectionId: conn._id,
                user: isSender ? conn.receiverId : conn.senderId,
                connectedAt: conn.updatedAt,
            };
        });
    }

    /**
     * GET /connections/requests
     * Returns all INCOMING pending requests for the current user.
     */
    async getIncomingRequests(userId) {
        return await connectionRepo.getIncomingRequests(userId);
    }

    /**
     * GET /connections/sent
     * Returns all OUTGOING pending requests sent by the current user.
     */
    async getOutgoingRequests(userId) {
        return await connectionRepo.getOutgoingRequests(userId);
    }

    // ─── WRITE ───────────────────────────────────────────────────────────────

    /**
     * POST /connections/request/:userId
     * Rules enforced: 1, 14, 15, 16, 18, 19
     */
    async sendRequest(senderId, receiverId) {
        // Rule 1 — Cannot connect to yourself
        if (String(senderId) === String(receiverId)) {
            throw new BadRequestError("You cannot send a connection request to yourself");
        }

        // Rule 14 — receiverId must be a valid, active user
        const receiver = await userRepo.findById(receiverId);
        if (!receiver || !receiver.active) {
            throw new NotFoundError("User not found");
        }

        // Rules 15, 16, 19 — Check existing connection in EITHER direction
        const existing = await connectionRepo.findBetweenUsers(senderId, receiverId);
        if (existing) {
            if (existing.status === "pending") {
                throw new ConflictError("A connection request already exists between you and this user");
            }
            if (existing.status === "accepted") {
                throw new ConflictError("You are already connected with this user");
            }
            // Rule 18/20 — Previously rejected: allow re-request by deleting and creating fresh
            if (existing.status === "rejected") {
                await connectionRepo.delete(existing._id);
                return await connectionRepo.create(senderId, receiverId);
            }
        }

        return await connectionRepo.create(senderId, receiverId);
    }

    /**
     * PATCH /connections/accept/:requestId
     * Rules enforced: 3, 7, 11, 17
     */
    async acceptRequest(currentUserId, requestId) {
        const connection = await connectionRepo.findById(requestId);

        // Rule 17 — Document must exist
        if (!connection) {
            throw new NotFoundError("Connection request not found");
        }

        // Rule 11 — Only the receiver can accept
        if (String(connection.receiverId) !== String(currentUserId)) {
            throw new ForbiddenError("Only the request receiver can accept this request");
        }

        // Rule 7 — Must be pending
        if (connection.status !== "pending") {
            throw new BadRequestError(`Cannot accept a request with status: ${connection.status}`);
        }

        return await connectionRepo.updateStatus(requestId, "accepted");
    }

    /**
     * PATCH /connections/reject/:requestId
     * Rules enforced: 4, 8, 11, 17, 18
     */
    async rejectRequest(currentUserId, requestId) {
        const connection = await connectionRepo.findById(requestId);

        // Rule 17
        if (!connection) {
            throw new NotFoundError("Connection request not found");
        }

        // Rule 11 — Only the receiver can reject
        if (String(connection.receiverId) !== String(currentUserId)) {
            throw new ForbiddenError("Only the request receiver can reject this request");
        }

        // Rule 8 — Must be pending
        if (connection.status !== "pending") {
            throw new BadRequestError(`Cannot reject a request with status: ${connection.status}`);
        }

        return await connectionRepo.updateStatus(requestId, "rejected");
    }

    /**
     * DELETE /connections/withdraw/:requestId
     * Rules enforced: 5, 9, 12, 17
     */
    async withdrawRequest(currentUserId, requestId) {
        const connection = await connectionRepo.findById(requestId);

        // Rule 17
        if (!connection) {
            throw new NotFoundError("Connection request not found");
        }

        // Rule 12 — Only the sender can withdraw
        if (String(connection.senderId) !== String(currentUserId)) {
            throw new ForbiddenError("Only the request sender can withdraw this request");
        }

        // Rule 9 — Must be pending
        if (connection.status !== "pending") {
            throw new BadRequestError(`Cannot withdraw a request with status: ${connection.status}`);
        }

        await connectionRepo.delete(requestId);
        return { message: "Connection request withdrawn" };
    }

    /**
     * DELETE /connections/remove/:userId
     * Rules enforced: 6, 10, 13, 17
     */
    async removeConnection(currentUserId, otherUserId) {
        // Rule 6/13 — Find connection in either direction
        const connection = await connectionRepo.findBetweenUsers(currentUserId, otherUserId);

        // Rule 17
        if (!connection) {
            throw new NotFoundError("No connection found with this user");
        }

        // Rule 10 — Must be accepted
        if (connection.status !== "accepted") {
            throw new BadRequestError(`Cannot remove a connection with status: ${connection.status}`);
        }

        // Rule 13 — Current user must be sender or receiver (guaranteed by findBetweenUsers, but explicit check)
        const isParty =
            String(connection.senderId) === String(currentUserId) ||
            String(connection.receiverId) === String(currentUserId);

        if (!isParty) {
            throw new ForbiddenError("You are not part of this connection");
        }

        await connectionRepo.delete(connection._id);
        return { message: "Connection removed" };
    }
}
