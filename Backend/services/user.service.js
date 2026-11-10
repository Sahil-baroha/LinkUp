import { userRepo } from "../repositories/user.repository.js";
import { connectionRepo } from "../repositories/connection.repository.js";
import { CacheService } from "../utils/cache.js";
import Connection from "../models/connections.model.js";
import User from "../models/user.model.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../utils/errors.js";

const cache = new CacheService();

export class UserService {
    /**
     * Fetch a single active user by ID, excluding password.
     * When requested by another user (requesterId !== id), email and active are stripped.
     * When requester is not the target, adds relationship object `connection: { status, requestId }`.
     * Omitted for own profile.
     */
    async getUserById(id, requesterId = null) {
        const user = await userRepo.findById(id);
        if (!user) throw new NotFoundError("User not found");
        if (!user.active) throw new NotFoundError("User not found");

        const userObj = typeof user.toObject === "function" ? user.toObject() : { ...user };
        if (!requesterId || String(requesterId) !== String(id)) {
            delete userObj.email;
            delete userObj.active;
            if (requesterId) {
                userObj.connection = await connectionRepo.getRelationship(requesterId, id);
            }
        }

        return userObj;
    }

    /**
     * Update only the allowed profile fields.
     * Enforces ownership — users can only update their own profile.
     * M9: Rejects updates from deactivated accounts (token may still be valid).
     */
    async updateProfile(requesterId, targetId, updates) {
        if (String(requesterId) !== String(targetId)) {
            throw new ForbiddenError("You can only update your own profile");
        }

        // M9: Deactivated user with a valid (non-expired) token must not mutate data
        const current = await userRepo.findById(targetId);
        if (!current) throw new NotFoundError("User not found");
        if (!current.active) throw new ForbiddenError("Account is deactivated");

        if (updates.username) {
            const existing = await userRepo.findByUsername(updates.username);
            if (existing && String(existing._id) !== String(targetId)) {
                throw new ConflictError("Username is already taken");
            }
        }

        const user = await userRepo.update(targetId, updates);
        if (!user) throw new NotFoundError("User not found");
        return user;
    }

    /**
     * Search for users by username or name.
     * Excludes inactive accounts. Results are paginated.
     * Adds connection: { status, requestId } to every result via one batched query.
     */
    async searchUsers(query, page, limit, requesterId = null) {
        const result = await userRepo.search(query, page, limit);
        if (requesterId && result.users && result.users.length > 0) {
            const targetIds = result.users.map(u => u._id);
            const connectionMap = await connectionRepo.getRelationshipsBatch(requesterId, targetIds);
            result.users = result.users.map(u => ({
                ...u,
                connection: connectionMap.get(String(u._id)) || { status: "none", requestId: null }
            }));
        } else if (result.users) {
            result.users = result.users.map(u => ({
                ...u,
                connection: { status: "none", requestId: null }
            }));
        }
        return result;
    }

    /**
     * Suggestions: Returns connection suggestions.
     * Excludes: self, inactive users, and any user who has ANY Connection document with the requester.
     * Ranking: friends-of-friends first by mutual accepted connections (count desc; ties by newest createdAt)
     * using getAcceptedConnectionIds from connection.repository.js; then fills remaining slots with newest eligible users.
     * Item shape: {_id, name, username, profilePicture, headline, mutualCount}; never email.
     * Cache suggestions:<userId>:<limit> for 120 s through CacheService (TTL only, no invalidation).
     */
    async getSuggestions(userId, limit = 5) {
        // Cache suggestions:<userId>:<limit> for 120 s through CacheService (TTL only, no invalidation)
        const cacheKey = `suggestions:${userId}:${limit}`;
        const cached = await cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // 1. Exclude self and any user with ANY connection document with the requester (pending, accepted, rejected)
        const userConnections = await Connection.find({
            $or: [{ senderId: userId }, { receiverId: userId }],
        })
            .select("senderId receiverId")
            .lean();

        const excludedUserIds = new Set([String(userId)]);
        for (const conn of userConnections) {
            excludedUserIds.add(String(conn.senderId));
            excludedUserIds.add(String(conn.receiverId));
        }

        // 2. Ranking: friends-of-friends first by mutual accepted connections using getAcceptedConnectionIds
        const myFriendIds = await connectionRepo.getAcceptedConnectionIds(userId);
        const myFriendSet = new Set(myFriendIds.map((id) => String(id)));

        const mutualCounts = new Map(); // candidateIdStr -> count

        if (myFriendIds.length > 0) {
            const friendConnections = await Connection.find({
                status: "accepted",
                $or: [
                    { senderId: { $in: myFriendIds } },
                    { receiverId: { $in: myFriendIds } },
                ],
            })
                .select("senderId receiverId")
                .lean();

            for (const conn of friendConnections) {
                const sStr = String(conn.senderId);
                const rStr = String(conn.receiverId);
                let candidateId = null;

                if (myFriendSet.has(sStr) && !myFriendSet.has(rStr)) {
                    candidateId = rStr;
                } else if (myFriendSet.has(rStr) && !myFriendSet.has(sStr)) {
                    candidateId = sStr;
                }

                if (candidateId && !excludedUserIds.has(candidateId)) {
                    mutualCounts.set(candidateId, (mutualCounts.get(candidateId) || 0) + 1);
                }
            }
        }

        let suggestions = [];

        if (mutualCounts.size > 0) {
            const candidateIds = Array.from(mutualCounts.keys());
            const fofUsers = await User.find({
                _id: { $in: candidateIds },
                active: true,
            })
                .select("name username profilePicture headline createdAt")
                .lean();

            // Sort: mutualCount desc, ties by newest createdAt
            fofUsers.sort((a, b) => {
                const countA = mutualCounts.get(String(a._id)) || 0;
                const countB = mutualCounts.get(String(b._id)) || 0;
                if (countB !== countA) {
                    return countB - countA;
                }
                const timeA = new Date(a.createdAt).getTime();
                const timeB = new Date(b.createdAt).getTime();
                return timeB - timeA;
            });

            for (const u of fofUsers) {
                if (suggestions.length >= limit) break;
                suggestions.push({
                    _id: u._id,
                    name: u.name,
                    username: u.username,
                    profilePicture: u.profilePicture,
                    headline: u.headline,
                    mutualCount: mutualCounts.get(String(u._id)) || 0,
                });
            }
        }

        // 3. Fill remaining slots with newest eligible users
        const remaining = limit - suggestions.length;
        if (remaining > 0) {
            const allExcludedIds = [
                ...Array.from(excludedUserIds),
                ...suggestions.map((s) => String(s._id)),
            ];

            const newestUsers = await User.find({
                _id: { $nin: allExcludedIds },
                active: true,
            })
                .select("name username profilePicture headline")
                .sort({ createdAt: -1 })
                .limit(remaining)
                .lean();

            for (const u of newestUsers) {
                suggestions.push({
                    _id: u._id,
                    name: u.name,
                    username: u.username,
                    profilePicture: u.profilePicture,
                    headline: u.headline,
                    mutualCount: 0,
                });
            }
        }

        // Cache suggestions:<userId>:<limit> for 120 s through CacheService (TTL only, no invalidation)
        await cache.set(cacheKey, suggestions, 120);

        return suggestions;
    }

    /**
     * Soft-delete an account by setting active = false.
     * Enforces ownership — users can only deactivate their own account.
     */
    async deactivateAccount(requesterId, targetId) {
        if (String(requesterId) !== String(targetId)) {
            throw new ForbiddenError("You can only deactivate your own account");
        }

        const user = await userRepo.softDelete(targetId);
        if (!user) throw new NotFoundError("User not found");
        return { message: "Account deactivated successfully" };
    }
}
