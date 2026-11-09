/**
 * ResilientStore — express-rate-limit Store backed by Redis with automatic
 * in-memory fallback when Redis is unavailable.
 *
 * Design:
 *  - Redis path: atomic Lua script (INCR + conditional PEXPIRE + TTL read),
 *    so a single round-trip gives totalHits and resetTime.
 *  - Memory path: delegates to express-rate-limit's own MemoryStore.
 *  - Transition between paths is logged once per direction, never per request.
 *  - Every Redis error is caught and swallowed; the call is retried via
 *    MemoryStore so the request path never sees a thrown error.
 *
 * Compatible with express-rate-limit v8 Store interface:
 *   init(options), increment(key), decrement(key), resetKey(key)
 */

import { createHash } from "crypto";
import { MemoryStore } from "express-rate-limit";
import { getRedisClient } from "./cache.js";

// ---------------------------------------------------------------------------
// Lua script
// ---------------------------------------------------------------------------
// KEYS[1] = full prefixed key
// ARGV[1] = windowMs as integer milliseconds
//
// Returns [count, pttl]:
//   count — hits so far (after INCR)
//   pttl  — remaining TTL in ms (always >= 1)
//
// PEXPIRE is set only on the first hit (count == 1) OR if TTL has gone
// negative (key exists but no expiry was ever applied — safety net).
const INCREMENT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
local ttl   = redis.call("PTTL", KEYS[1])
if count == 1 or ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

// ---------------------------------------------------------------------------
// ResilientStore
// ---------------------------------------------------------------------------
export class ResilientStore {
  /**
   * @param {string} prefix   - e.g. "rl:authIp:"
   */
  constructor(prefix) {
    this.prefix = prefix;
    this.windowMs = 60_000; // overridden by init()

    // MemoryStore used as fallback when Redis is unavailable
    this._memory = new MemoryStore();

    // Track which backend is active for transition logging
    this._usingRedis = null; // null = not yet determined

    // The Store interface requires localKeys=false for shared Redis stores
    // so ERL's double-count guard doesn't fire incorrectly.
    this.localKeys = false;
  }

  // -------------------------------------------------------------------------
  // Store interface: init(options)
  // -------------------------------------------------------------------------
  init(options) {
    this.windowMs = options.windowMs;
    this._memory.init(options);
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------
  _prefixedKey(key) {
    return this.prefix + key;
  }

  _redisReady() {
    const client = getRedisClient();
    return client !== null && client.status === "ready";
  }

  _logTransition(toRedis) {
    if (this._usingRedis === toRedis) return; // no change
    this._usingRedis = toRedis;
    if (toRedis) {
      console.log(`[RateLimit:${this.prefix}] switched to Redis store.`);
    } else {
      console.warn(`[RateLimit:${this.prefix}] Redis unavailable, using memory fallback.`);
    }
  }

  // -------------------------------------------------------------------------
  // Store interface: increment(key) → { totalHits, resetTime }
  // -------------------------------------------------------------------------
  async increment(key) {
    if (this._redisReady()) {
      try {
        const client = getRedisClient();
        const fullKey = this._prefixedKey(key);
        // eval: script, numkeys, ...keys, ...args
        const result = await client.eval(
          INCREMENT_SCRIPT,
          1,                          // numkeys
          fullKey,                    // KEYS[1]
          String(this.windowMs),      // ARGV[1]
        );
        // result is [count, pttl] from Lua return {count, ttl}
        const [count, pttl] = result;
        this._logTransition(true);
        return {
          totalHits: Number(count),
          resetTime: new Date(Date.now() + Number(pttl)),
        };
      } catch {
        this._logTransition(false);
        // fall through to memory store
      }
    } else {
      this._logTransition(false);
    }

    return this._memory.increment(key);
  }

  // -------------------------------------------------------------------------
  // Store interface: decrement(key)
  // Guarded DECR: never allows key to go below 0.
  // -------------------------------------------------------------------------
  async decrement(key) {
    if (this._redisReady()) {
      try {
        const client = getRedisClient();
        const fullKey = this._prefixedKey(key);
        // Lua: only decrement if current value > 0; never go negative
        const DECR_SCRIPT = `
local v = redis.call("GET", KEYS[1])
if v and tonumber(v) > 0 then
  return redis.call("DECR", KEYS[1])
end
return 0
`;
        await client.eval(DECR_SCRIPT, 1, fullKey);
        return;
      } catch {
        // fall through to memory store
      }
    }
    return this._memory.decrement(key);
  }

  // -------------------------------------------------------------------------
  // Store interface: resetKey(key)
  // -------------------------------------------------------------------------
  async resetKey(key) {
    // Always reset both so they stay in sync when switching backends
    if (this._redisReady()) {
      try {
        const client = getRedisClient();
        await client.del(this._prefixedKey(key));
      } catch {
        // ignore
      }
    }
    return this._memory.resetKey(key);
  }
}
