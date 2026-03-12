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

    async findByUsername(username) {
        const cacheKey = `user:username:${username}`;
        let user = await cache.get(cacheKey);
        if (!user) {
            user = await User.findOne({ username });
            if (user) await cache.set(cacheKey, user, 300);
        }
        return user;
    }

    async findById(id) {
        const cacheKey = `user:id:${id}`;
        let user = await cache.get(cacheKey);
        if (!user) {
            user = await User.findById(id).select("-password");
            if (user) await cache.set(cacheKey, user, 300);
        }
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
     * Cache is cleared so stale "active" data is not served.
     */
    async softDelete(id) {
        const user = await User.findByIdAndUpdate(
            id,
            { active: false },
            { new: true }
        ).select("-password");

        if (user) {
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
