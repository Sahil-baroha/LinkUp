import { userRepo } from "../repositories/user.repository.js";
import { connectionRepo } from "../repositories/connection.repository.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../utils/errors.js";

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
