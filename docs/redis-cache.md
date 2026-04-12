# ⚡ Redis Cache System

> Redis is used as an optional, transparent speed layer on top of MongoDB.
> The app works identically without it — Redis only makes it faster.

---

## Why Cache At All?

Some queries run on **every authenticated request**.  
Finding a user by ID, for example, happens every time a protected route is hit — the auth middleware has to verify that the user in the JWT still exists in the database.

Without caching, that is a MongoDB round-trip on every single request.  
With caching, the result is served from memory in under 1ms.

---

## The Cache-Aside Pattern

This is the strategy used throughout LinkUp. The repository checks Redis **before** going to MongoDB, and writes to Redis **after** a successful DB read.

```
Repository method called (e.g. findById)
           │
           ▼
    ┌─────────────┐
    │ Check Redis │  GET user:id:{id}
    └──────┬──────┘
           │
     ┌─────┴──────┐
     │            │
   [HIT]        [MISS]
     │            │
     ▼            ▼
  Return       Query MongoDB
  cached       User.findById(id)
  object            │
                    ▼
              Store in Redis
              SETEX user:id:{id} 300 <json>
                    │
                    ▼
              Return fresh object
```

**The key rule:** The repository never assumes Redis has data. MongoDB is always the source of truth. Redis is only a shortcut.

---

## `CacheService` — The Wrapper (`utils/cache.js`)

All Redis operations are wrapped in a single class. No other file touches `ioredis` directly.

### Connection Behaviour

```
App starts
    │
    ▼
REDIS_URL set?
    │
  Yes → Connect to provided URL
  No  → Try localhost:6379
    │
    ▼
Connection succeeds? → "Redis connected" logged, cache is active
Connection fails?    → Warning logged, redis = null, cache silently disabled
```

The `retryStrategy: () => null` option tells ioredis to **try once and give up**, not retry in a loop. This makes startup fast even when Redis is unavailable.

### Methods

| Method | What it does |
|--------|-------------|
| `get(key)` | Returns parsed JSON from Redis, or `null` on miss/error |
| `set(key, value, ttl)` | Serializes value to JSON and stores with `SETEX`. TTL defaults to 300s |
| `delete(key)` | Removes a single key |
| `invalidatePattern(pattern)` | Deletes all keys matching a glob pattern using non-blocking `SCAN` |

### Why `SCAN` instead of `KEYS`?

`redis.keys("user:*")` is a **blocking** command. It pauses the entire Redis event loop until it finishes scanning every key in the database. On a large dataset this can cause latency spikes across all clients sharing the Redis instance.

`redis.scanStream()` is **non-blocking** — it iterates in batches of 100 keys, yielding between batches so other commands can run.

```
KEYS "user:*"          →  Blocks Redis for entire scan duration
SCAN + stream (batches) →  Yields between batches — safe for production
```

---

## What Gets Cached and Why

| Cache Key | TTL | Cached in | Why |
|-----------|-----|-----------|-----|
| `user:id:{id}` | 300s | `UserRepository.findById` | Hit on every authenticated request via auth middleware |
| `user:username:{username}` | 300s | `UserRepository.findByUsername` | Hit on profile lookups by handle |

### What is intentionally NOT cached

| Query | Reason |
|-------|--------|
| `findByEmail` | Only used during login. Login is infrequent. Also requires the raw Mongoose document (with `password` hash) — caching partial objects here creates type mismatch bugs. |
| Post queries | Posts change frequently (edits, deletes, new comments). Caching them would require complex invalidation logic with little benefit for a v1. |
| Connection queries | Mutable and user-specific. Feed generation uses live DB data intentionally. |

---

## Object Serialization — A Critical Detail

Redis stores strings. When you cache a Mongoose document directly, `JSON.stringify` serializes the **Mongoose document object**, not the plain data. When you read it back with `JSON.parse`, you get a plain JavaScript object — it has no Mongoose methods like `.toObject()` or `.save()`.

**The fix:** always call `.toObject()` before caching.

```javascript
// In UserRepository.findById:
const user = await User.findById(id);
if (user) await cache.set(cacheKey, user.toObject(), 300); // ← plain object stored
```

This means callers of `findById` and `findByUsername` will receive either:
- A **plain object** (from cache), or
- A **Mongoose document** (from a fresh DB hit)

The comments in `auth.service.js` explicitly document which methods return which type, so callers know whether `.toObject()` is safe to call.

---

## Cache Invalidation

When a user's data changes, stale entries must be removed before the TTL expires.

```
update() called on UserRepository
          │
          ▼
  MongoDB updated (findByIdAndUpdate)
          │
          ▼
  Delete cache keys immediately:
  ├── DEL user:id:{id}
  ├── DEL user:username:{username}
  └── DEL user:email:{email}
          │
          ▼
  Next request is a cache MISS
  → fresh data fetched from MongoDB
  → new cache entry written
```

**Why delete all three keys?** A username or email update would leave the old key pointing to stale data. Deleting all three covers every lookup pattern.

**Deactivation is treated the same way.** When `softDelete` (account deactivation) is called, cache is invalidated immediately — not left to expire naturally. A deactivated account must never be served from a stale cache entry.

---

## Graceful Fallback — No Redis Required

The entire cache layer is designed so that removing Redis from the equation changes **nothing about correctness**, only performance.

```javascript
async get(key) {
    if (!redis) return null;   // ← no Redis → always a cache miss → DB is used
    ...
}

async set(key, value, ttl) {
    if (!redis) return;        // ← no Redis → skip silently
    ...
}
```

Every cache miss falls through to MongoDB. The application is fully functional without Redis — it just makes more database queries.

**To run without Redis:** simply omit `REDIS_URL` from your `.env`. The startup warning is logged once, and then everything works normally.
