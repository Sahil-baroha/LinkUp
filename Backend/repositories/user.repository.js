import User from "../models/user.model.js";
import { CacheService } from "../utils/cache.js";

const cache = new CacheService();

export class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async findByEmail(email) {
        return await User.findOne({ email });
    }

    /**
     * C5: Cache stores plain objects (via toObject() before JSON.stringify).
     * This prevents TypeError when downstream code (e.g. AuthService.login)
     * receives a cached result and tries to call Mongoose instance methods.
     * Cache always serves plain objects; callers must NOT call .toObject() on result.
     */
    async findByUsername(username) {
        const cacheKey = `user:username:${username}`;
        const cached = await cache.get(cacheKey);
        if (cached) return cached;                          // already a plain object

        const user = await User.findOne({ username });
        if (user) await cache.set(cacheKey, user.toObject(), 300);  // store plain object
        return user;
    }

    async findById(id) {
        const cacheKey = `user:id:${id}`;
        const cached = await cache.get(cacheKey);
        if (cached) return cached;                          // already a plain object

        const user = await User.findById(id).select("-password");
        if (user) await cache.set(cacheKey, user.toObject(), 300);  // store plain object
        return user;
    }

    async checkExists(email, username) {
        return await User.findOne({ $or: [{ email }, { username }] });
    }

    /**
     * Update specific fields. Invalidates all cache keys for this user.
     */
    async update(id, updates) {
        const user = await User.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).select("-password");

        if (user) {
            await cache.delete(`user:id:${id}`);
            await cache.delete(`user:username:${user.username}`);
            await cache.delete(`user:email:${user.email}`);
        }
        return user;
    }

    /**
     * Soft delete — sets active = false instead of removing the document.
     * M14: Cache is immediately invalidated (not left to expire) so a deactivated
     * user's profile is never served from cache — critical for security-driven deactivations.
     */
    async softDelete(id) {
        const user = await User.findByIdAndUpdate(
            id,
            { active: false },
            { new: true }
        ).select("-password");

        if (user) {
            // M14: Immediate invalidation — do not wait for TTL
            await cache.delete(`user:id:${id}`);
            await cache.delete(`user:username:${user.username}`);
            await cache.delete(`user:email:${user.email}`);
        }
        return user;
    }

    /**
     * Full-text style search on username OR name using a case-insensitive regex.
     * Filters out deactivated accounts. Uses pagination.
     */
    async search(query, page = 1, limit = 10) {
        const regex = new RegExp(query, "i");
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find({
                active: true,
                $or: [{ username: regex }, { name: regex }]
            })
                .select("-password")
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments({
                active: true,
                $or: [{ username: regex }, { name: regex }]
            })
        ]);

        return { users, total, page, pages: Math.ceil(total / limit) };
    }
}

// m6: Singleton export — prevents multiple instantiations across services
export const userRepo = new UserRepository();
