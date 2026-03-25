import { userRepo } from "../repositories/user.repository.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../utils/errors.js";

export class UserService {
    /**
     * Fetch a single active user by ID, excluding password.
     */
    async getUserById(id) {
        const user = await userRepo.findById(id);
        if (!user) throw new NotFoundError("User not found");
        if (!user.active) throw new NotFoundError("User not found");
        return user;
    }

    /**
     * Update only the allowed profile fields (username and/or profilePicture).
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
     */
    async searchUsers(query, page, limit) {
        return await userRepo.search(query, page, limit);
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
