import Connection from "../models/connections.model.js";
import { CacheService } from "../utils/cache.js";

const cache = new CacheService();

/** Cache key for accepted connection ID lists */
function connIdsKey(userId) {
    return `connections:ids:${userId}`;
}

export class ConnectionRepository {

    /**
     * Find a connection between two users in EITHER direction.
     * This is the core query for preventing reverse duplicates (Rule 15 & 16).
     */
    async findBetweenUsers(userAId, userBId) {
        return await Connection.findOne({
            $or: [
                { senderId: userAId, receiverId: userBId },
                { senderId: userBId, receiverId: userAId },
            ]
        });
    }

    /**
     * Find a connection document by its own _id.
     */
    async findById(connectionId) {
        return await Connection.findById(connectionId);
    }

    /**
     * Create a new pending connection request.
     */
    async create(senderId, receiverId) {
        const connection = new Connection({ senderId, receiverId, status: "pending" });
        return await connection.save();
    }

    /**
     * Update the status field of a connection document.
     * C2: Invalidates accepted-connection-id caches for BOTH users when the
     * status transitions to or from "accepted".
     */
    async updateStatus(connectionId, status) {
        const connection = await Connection.findByIdAndUpdate(
            connectionId,
            { status },
            { returnDocument: "after" }
        );

        // Invalidate both users' caches whenever the accepted set may have changed
        if (connection && status === "accepted") {
            await Promise.all([
                cache.delete(connIdsKey(String(connection.senderId))),
                cache.delete(connIdsKey(String(connection.receiverId))),
            ]);
        }

        return connection;
    }

    /**
     * Hard-delete a connection document (used for withdraw and remove).
     * C2: If the connection was accepted, invalidate both users' ID caches.
     */
    async delete(connectionId) {
        const connection = await Connection.findByIdAndDelete(connectionId);

        // Invalidate caches only when removing an accepted connection
        if (connection && connection.status === "accepted") {
            await Promise.all([
                cache.delete(connIdsKey(String(connection.senderId))),
                cache.delete(connIdsKey(String(connection.receiverId))),
            ]);
        }

        return connection;
    }

    /**
     * Get all accepted connections for a user (in either sender or receiver position).
     * Populates basic info of the other party.
     */
    async getAcceptedConnections(userId) {
        return await Connection.find({
            $or: [{ senderId: userId }, { receiverId: userId }],
            status: "accepted"
        })
            .populate("senderId", "name username profilePicture headline")
            .populate("receiverId", "name username profilePicture headline")
            .sort({ updatedAt: -1 })
            .lean();
    }

    /**
     * Get all pending incoming requests for a user (they are the receiver).
     */
    async getIncomingRequests(userId) {
        return await Connection.find({
            receiverId: userId,
            status: "pending"
        })
            .populate("senderId", "name username profilePicture headline")
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Get all pending outgoing requests sent by a user (they are the sender).
     */
    async getOutgoingRequests(userId) {
        return await Connection.find({
            senderId: userId,
            status: "pending"
        })
            .populate("receiverId", "name username profilePicture headline")
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Feed Step 1: Resolve the set of user IDs this user is connected to.
     * Returns plain ObjectId array — caller maps these into the post query.
     *
     * C2: Cache-aside with 300 s TTL under "connections:ids:<userId>".
     * Stores an array of ID strings (JSON-safe). Returns the same ObjectId
     * array type as before by converting cached strings back to ObjectIds via
     * the mongoose Types.ObjectId constructor — callers (feed) pass these
     * directly into a Mongoose $in query which accepts both.
     *
     * Uses lean() + select() to avoid loading unnecessary fields.
     * Returns [] when the user has no accepted connections (feed short-circuit).
     */
    async getAcceptedConnectionIds(userId) {
        const cacheKey = connIdsKey(String(userId));
        const cached = await cache.get(cacheKey);

        if (cached) {
            // cached is an array of plain id strings — return as-is since
            // Mongoose's $in operator accepts string ObjectIds.
            return cached;
        }

        const connections = await Connection.find({
            $or: [{ senderId: userId }, { receiverId: userId }],
            status: "accepted",
        })
            .select("senderId receiverId")
            .lean();

        // Extract the OTHER party's ID from each connection document
        const ids = connections.map((c) =>
            c.senderId.toString() === userId.toString() ? c.receiverId : c.senderId
        );

        // Store as array of plain id strings (JSON-safe)
        const idStrings = ids.map((id) => id.toString());
        await cache.set(cacheKey, idStrings, 300);

        return ids;
    }
}

// m6: Singleton export — prevents multiple instantiations across services
export const connectionRepo = new ConnectionRepository();
