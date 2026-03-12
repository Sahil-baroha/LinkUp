import { UserRepository } from "../repositories/user.repository.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../utils/errors.js";

const userRepository = new UserRepository();

export class UserService {
    /**
     * Fetch a single active user by ID, excluding password.
     */
    async getUserById(id) {
        const user = await userRepository.findById(id);
        if (!user) throw new NotFoundError("User not found");
        if (!user.active) throw new NotFoundError("User not found");
        return user;
    }

    /**
     * Update only the allowed profile fields (username and/or profilePicture).
     * Enforces ownership — users can only update their own profile.
     */
    async updateProfile(requesterId, targetId, updates) {
        if (String(requesterId) !== String(targetId)) {
            throw new ForbiddenError("You can only update your own profile");
        }

        if (updates.username) {
            const existing = await userRepository.findByUsername(updates.username);
            if (existing && String(existing._id) !== String(targetId)) {
                throw new ConflictError("Username is already taken");
            }
        }

        const user = await userRepository.update(targetId, updates);
        if (!user) throw new NotFoundError("User not found");
        return user;
    }

    /**
     * Search for users by username or name.
     * Excludes inactive accounts. Results are paginated.
     */
    async searchUsers(query, page, limit) {
        return await userRepository.search(query, page, limit);
    }

    /**
     * Soft-delete an account by setting active = false.
     * Enforces ownership — users can only deactivate their own account.
     */
    async deactivateAccount(requesterId, targetId) {
        if (String(requesterId) !== String(targetId)) {
            throw new ForbiddenError("You can only deactivate your own account");
        }

        const user = await userRepository.softDelete(targetId);
        if (!user) throw new NotFoundError("User not found");
        return { message: "Account deactivated successfully" };
    }
}
