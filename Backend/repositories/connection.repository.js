import Connection from "../models/connections.model.js";

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
     */
    async updateStatus(connectionId, status) {
        return await Connection.findByIdAndUpdate(
            connectionId,
            { status },
            { new: true }
        );
    }

    /**
     * Hard-delete a connection document (used for withdraw and remove).
     */
    async delete(connectionId) {
        return await Connection.findByIdAndDelete(connectionId);
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
            .populate("senderId", "name username profilePicture")
            .populate("receiverId", "name username profilePicture")
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
            .populate("senderId", "name username profilePicture")
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
            .populate("receiverId", "name username profilePicture")
            .sort({ createdAt: -1 })
            .lean();
    }
}
