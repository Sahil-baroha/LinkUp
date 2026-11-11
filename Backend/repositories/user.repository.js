import User from "../models/user.model.js";
import { CacheService } from "../utils/cache.js";
import { escapeRegex } from "../utils/regex.js";

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

        const user = await User.findOne({ username }).select("-password");
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
            { returnDocument: "after", runValidators: true }
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
            { returnDocument: "after" }
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
     * Search for users with prefix matches first, followed by contains matches.
     * Selects ONLY name, username, profilePicture, headline, location.
     * Filters out deactivated accounts, optionally excludes requesterId, and respects pagination.
     */
    async search(query, page = 1, limit = 10, requesterId = null) {
        const safeQuery = escapeRegex(query);
        const prefixRegex = new RegExp(`^${safeQuery}`, "i");
        const containsRegex = new RegExp(safeQuery, "i");
        const SEARCH_PROJECTION = "name username profilePicture headline location";

        // Two-query approach for prefix-first relevance ordering with pagination:
        // 1. Query prefix matches where name or username starts with the query.
        // 2. Query other contains matches where name or username contains the query,
        //    excluding users who already matched the prefix query to prevent duplicates.
        // Slice and combine results across page/limit boundaries so prefix matches appear first.
        const prefixFilter = {
            active: true,
            $or: [{ username: prefixRegex }, { name: prefixRegex }],
        };
        if (requesterId) {
            prefixFilter._id = { $ne: requesterId };
        }

        const containsFilter = {
            active: true,
            $or: [{ username: containsRegex }, { name: containsRegex }],
            username: { $not: prefixRegex },
            name: { $not: prefixRegex },
        };
        if (requesterId) {
            containsFilter._id = { $ne: requesterId };
        }

        const [prefixCount, containsCount] = await Promise.all([
            User.countDocuments(prefixFilter),
            User.countDocuments(containsFilter),
        ]);

        const total = prefixCount + containsCount;
        const skip = (page - 1) * limit;

        let users = [];
        if (skip < prefixCount) {
            const prefixLimit = Math.min(limit, prefixCount - skip);
            const prefixUsers = await User.find(prefixFilter)
                .select(SEARCH_PROJECTION)
                .skip(skip)
                .limit(prefixLimit)
                .lean();

            users.push(...prefixUsers);

            const remaining = limit - prefixUsers.length;
            if (remaining > 0 && containsCount > 0) {
                const containsUsers = await User.find(containsFilter)
                    .select(SEARCH_PROJECTION)
                    .skip(0)
                    .limit(remaining)
                    .lean();

                users.push(...containsUsers);
            }
        } else {
            const containsSkip = skip - prefixCount;
            const containsUsers = await User.find(containsFilter)
                .select(SEARCH_PROJECTION)
                .skip(containsSkip)
                .limit(limit)
                .lean();

            users.push(...containsUsers);
        }

        return { users, total, page, pages: Math.ceil(total / limit) };
    }
}

// m6: Singleton export — prevents multiple instantiations across services
export const userRepo = new UserRepository();
