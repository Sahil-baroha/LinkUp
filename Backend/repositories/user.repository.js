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
            user = await User.findById(id);
            if (user) await cache.set(cacheKey, user, 300);
        }
        return user;
    }

    async checkExists(email, username) {
        return await User.findOne({ $or: [{ email }, { username }] });
    }

    async update(id, updates) {
        const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (user) {
            await cache.delete(`user:id:${id}`);
            await cache.delete(`user:username:${user.username}`);
            await cache.delete(`user:email:${user.email}`);
        }
        return user;
    }
}
