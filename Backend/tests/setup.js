// Set environment defaults before any app or config/env.js import.
// DO NOT statically import any app modules (cache.js, env.js, app.js) here.
process.env.NODE_ENV ??= "test";
process.env.MONGO_URL ??= "mongodb://127.0.0.1:27017/linkup_test";
process.env.REDIS_URL ??= "redis://127.0.0.1:6379/1";
process.env.JWT_SECRET ??= "test_jwt_secret_48_characters_long_for_linkup_12"; // 48 chars
process.env.CLIENT_URL ??= "http://localhost:3000";
process.env.TRUST_PROXY ??= "1";

import mongoose from "mongoose";
import Redis from "ioredis";

/**
 * Safety guard: Refuses to run if MONGO_URL contains "mongodb+srv"
 * or its database name does not end in "_test".
 */
export function verifyTestDatabase(url = process.env.MONGO_URL) {
    if (!url) {
        throw new Error("SAFETY GUARD: MONGO_URL is not set.");
    }
    if (url.includes("mongodb+srv")) {
        throw new Error("SAFETY GUARD: MONGO_URL contains mongodb+srv. Refusing to run tests against remote database.");
    }
    const dbMatch = url.match(/\/([^/?#]+)(?:\?|$)/);
    const dbName = dbMatch ? dbMatch[1] : "";
    if (!dbName.endsWith("_test")) {
        throw new Error(`SAFETY GUARD: Database name "${dbName}" does not end in "_test". Refusing to run tests.`);
    }
}

// Execute guard check immediately on load
verifyTestDatabase();

/**
 * Helper to connect Mongoose to test Mongo DB
 */
export async function connectTestMongo() {
    verifyTestDatabase();
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URL, {
            family: 4,
            serverSelectionTimeoutMS: 10000,
        });
    }
}

/**
 * Helper to drop test database and close Mongoose connection
 */
export async function cleanupTestMongo() {
    verifyTestDatabase();
    if (mongoose.connection.readyState !== 0) {
        if (mongoose.connection.db) {
            await mongoose.connection.dropDatabase();
        }
        await mongoose.connection.close();
    }
}

/**
 * Helper to FLUSHDB on Redis DB 1
 */
export async function flushTestRedis() {
    let client = null;
    try {
        const cacheMod = await import("../utils/cache.js");
        client = cacheMod.getRedisClient?.();
    } catch {
        // app not loaded yet
    }

    if (client && client.status === "ready") {
        await client.flushdb();
        return;
    }

    const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379/1", {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
    });
    try {
        await new Promise((resolve) => {
            if (redis.status === "ready") return resolve();
            redis.once("ready", resolve);
            redis.once("error", resolve);
            setTimeout(resolve, 1500);
        });
        if (redis.status === "ready") {
            await redis.flushdb();
        }
    } catch {
        // Suppress if Redis is intentionally down
    } finally {
        redis.disconnect();
    }
}
