import Redis from "ioredis";

let redis = null;
try {
    // Only attempt connection if REDIS_URL is provided, or default to localhost
    // For local dev without redis, it will log a warning and fallback to no-cache
    if (process.env.NODE_ENV !== 'test') {
        redis = new Redis(process.env.REDIS_URL || {
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT || "6379"),
            maxRetriesPerRequest: 1,
            retryStrategy: () => null // Try once, fail fast
        });
        redis.on("connect", () => {
            console.log("Redis connected");
        });
        redis.on('error', (err) => {
            console.warn('Redis connection failed, continuing without cache.');
            redis.disconnect(); // stop retrying
            redis = null;
        });
    }
} catch (e) {
    console.warn('Failed to init redis, continuing without cache');
}

export class CacheService {
    async get(key) {
        if (!redis) return null;
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            // m5: Log cache read errors instead of silently swallowing them
            console.error(`[CacheService] get error for key "${key}":`, e.message);
            return null;
        }
    }

    async set(key, value, ttl = 300) {
        if (!redis) return;
        try {
            const serialized = JSON.stringify(value);
            if (ttl) {
                await redis.setex(key, ttl, serialized);
            } else {
                await redis.set(key, serialized);
            }
        } catch (e) {
            // m5: Log cache write errors — silent failures hide serialization bugs
            console.error(`[CacheService] set error for key "${key}":`, e.message);
        }
    }

    async delete(key) {
        if (!redis) return;
        try {
            await redis.del(key);
        } catch (e) {
            // m5: Log cache delete errors
            console.error(`[CacheService] delete error for key "${key}":`, e.message);
        }
    }

    /**
     * M11: Pattern-based cache invalidation using SCAN instead of KEYS.
     * redis.keys() is a blocking O(N) operation that pauses the Redis event loop.
     * scanStream() is non-blocking and safe for production use.
     */
    async invalidatePattern(pattern) {
        if (!redis) return;
        try {
            const stream = redis.scanStream({ match: pattern, count: 100 });
            for await (const keys of stream) {
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            }
        } catch (e) {
            console.error(`[CacheService] invalidatePattern error for pattern "${pattern}":`, e.message);
        }
    }
}
