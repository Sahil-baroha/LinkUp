// Cache serialization limits:
// Values are stored as JSON.stringify. ObjectId fields become strings on
// deserialization. Date fields become ISO strings, not Date objects.
// Callers must handle this if type fidelity matters.

import Redis from "ioredis";
import { env } from "../config/env.js";

// --- state tracking for transition-only logging ---
let lastStatus = null; // "up" | "down" | "disabled"
let isShuttingDown = false;

function logTransition(next) {
  if (next !== lastStatus) {
    lastStatus = next;
    if (next === "up") {
      console.log("[Cache] Redis connection established.");
    } else if (next === "down") {
      console.warn("[Cache] Redis connection lost, running without cache.");
    }
    // "disabled" needs no log — env.js startup already makes it visible
  }
}

// Determine connection — no client if neither REDIS_URL nor REDIS_HOST is set
let redis = null;

if (env.REDIS_URL || env.REDIS_HOST) {
  // When REDIS_URL is set, pass it as a string (ioredis v5 parseOptions handles
  // string args via parseURL). When only host/port are set, pass a plain object.
  const connectionArg = env.REDIS_URL
    ? env.REDIS_URL
    : { host: env.REDIS_HOST, port: env.REDIS_PORT || 6379 };

  const clientOptions = {
    connectTimeout: 2000,         // ms to wait for TCP handshake
    commandTimeout: 250,          // ms per command before ReplyError timeout
    enableOfflineQueue: false,    // reject commands immediately while disconnected
    maxRetriesPerRequest: 1,      // retry each command at most once
    retryStrategy(times) {
      // Never return null — always reconnect (unless shutting down).
      if (isShuttingDown) return null;
      // Exponential backoff: 100, 200, 400 … capped at 5000 ms
      return Math.min(100 * Math.pow(2, times - 1), 5000);
    },
  };

  // ioredis v5 parseOptions iterates constructor args in order:
  //   string → parseURL, object → defaults-merge, number → port
  // Passing (connectionArg, clientOptions) merges both correctly.
  redis = new Redis(connectionArg, clientOptions);

  // Transition events — log only on status change
  redis.on("ready", () => logTransition("up"));

  // "close" fires whenever the socket drops (after each failed attempt too)
  redis.on("close", () => {
    if (!isShuttingDown) logTransition("down");
  });

  // Suppress per-error spam; transitions are covered by "close" / "ready"
  redis.on("error", () => {});

  // Initial state: not yet connected
  logTransition("down");
} else {
  logTransition("disabled");
}

/**
 * Returns "up" | "down" | "disabled".
 * "up" only when the client is in the "ready" state.
 */
export function getCacheStatus() {
  if (!redis) return "disabled";
  if (redis.status === "ready") return "up";
  return "down";
}

/**
 * Exposes the raw ioredis client for callers that need direct access
 * (e.g. rate-limiter, session store). Returns null when Redis is disabled.
 */
export function getRedisClient() {
  return redis;
}

/**
 * Gracefully disconnect Redis during server shutdown.
 * Sets isShuttingDown so retryStrategy stops reconnecting.
 */
export async function disconnectRedis() {
  isShuttingDown = true;
  if (redis) {
    try {
      await redis.quit();
    } catch {
      redis.disconnect();
    }
    redis = null;
  }
}

export class CacheService {
  /**
   * Returns parsed value or null on miss / error / Redis unavailable.
   */
  async get(key) {
    if (!redis || redis.status !== "ready") return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      // Redis error or timeout — treat as cache miss, never throw
      return null;
    }
  }

  /**
   * Stores value as JSON with optional TTL (seconds, default 300).
   * Silently no-ops when Redis is unavailable or an error occurs.
   */
  async set(key, value, ttl = 300) {
    if (!redis || redis.status !== "ready") return;
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch {
      // Cache write failure — ignore, callers fall through to DB
    }
  }

  /**
   * Deletes a single key. Silently no-ops on error.
   */
  async delete(key) {
    if (!redis || redis.status !== "ready") return;
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }

  /**
   * Pattern-based invalidation via non-blocking SCAN.
   * Uses scanStream (safe for production) instead of KEYS.
   */
  async invalidatePattern(pattern) {
    if (!redis || redis.status !== "ready") return;
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      for await (const keys of stream) {
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch {
      // ignore
    }
  }
}
