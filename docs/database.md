# 🗄️ LinkUp — Database Reference

> The database layer uses **MongoDB** via Mongoose ODM. All database interaction is isolated inside the `repositories/` directory — no other layer touches MongoDB directly.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Connection Setup](#connection-setup)
3. [User Model](#user-model)
4. [Indexes](#indexes)
5. [Redis Cache Layer](#redis-cache-layer)
6. [Repository Abstraction](#repository-abstraction)

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Database | MongoDB (Atlas or local) |
| ODM | Mongoose v8 |
| Cache | Redis (optional, graceful fallback) |
| Cache Client | `ioredis` (via `CacheService` wrapper) |

---

## Connection Setup

The database connection is established in `server.js` during application startup.

```javascript
await mongoose.connect(process.env.MONGO_URL, {
    family: 4  // Force IPv4 — fixes DNS resolution issues on newer Node versions
});
```

> **Why `family: 4`?** Mongoose (and Node's DNS resolver) sometimes attempts an IPv6 lookup first. On certain network configurations this times out. Forcing IPv4 ensures a reliable connection.

The connection string is read from the `MONGO_URL` environment variable. Never hardcode connection strings in source code.

---

## User Model

**File:** `models/user.model.js`  
**Collection:** `users` (auto-pluralized by Mongoose)

### Schema Definition

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `name` | String | ✅ | ❌ | — | User's display name |
| `username` | String | ✅ | ✅ | — | Unique handle used for lookups and mentions |
| `email` | String | ✅ | ✅ | — | Login credential, must be a valid email |
| `password` | String | ✅ | ❌ | — | Bcrypt hash — **never** the plaintext password |
| `active` | Boolean | ❌ | ❌ | `true` | Account status flag (reserved for soft-delete) |
| `profilePicture` | String | ❌ | ❌ | `""` | File path of the uploaded profile image |
| `createdAt` | Date | — | — | auto | Set by `timestamps: true` |
| `updatedAt` | Date | — | — | auto | Set by `timestamps: true` |

### Key Design Decisions

**Passwords are hashed, not stored.** The `password` field holds a `bcrypt` hash (10 salt rounds). The service layer is responsible for hashing before calling the repository. The model itself has no pre-save hook for hashing — this keeps the model simple and makes the hashing step explicit in the service.

**`active` flag is a placeholder.** It defaults to `true` but is not yet used by any endpoint. It is reserved for future soft-delete functionality — instead of removing a user document, setting `active: false` would deactivate the account while preserving data.

**`timestamps: true`** automatically adds `createdAt` and `updatedAt` to every document, managed by Mongoose.

---

## Indexes

```javascript
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
```

Both `email` and `username` are individually indexed in ascending order (`1`). This makes the following queries fast:

- `User.findOne({ email })` — used during login
- `User.findOne({ username })` — used during profile lookup
- `User.findOne({ $or: [{ email }, { username }] })` — used during duplicate checks

> **Why not a compound index on `{ email, username }`?** A compound index would only accelerate queries that filter on *both* fields simultaneously. Since the application mostly queries one field at a time, separate single-field indexes are more efficient here.

Mongoose also creates a unique constraint index for fields marked `unique: true`. This means duplicate `email` or `username` values are rejected at the **database level** as well as the service level.

---

## Redis Cache Layer

**File:** `utils/cache.js`

Redis is used as an optional, transparent cache layer on top of MongoDB.

### Cache Keys

| Key Pattern | TTL | Used by |
|-------------|-----|---------|
| `user:id:{id}` | 300 seconds (5 min) | `findById()` |
| `user:username:{username}` | 300 seconds (5 min) | `findByUsername()` |
| `user:email:{email}` | — | Invalidation only |

### Graceful Fallback

If Redis is not configured (no `REDIS_URL` environment variable), `CacheService` returns `null` on all `get()` calls and silently ignores `set()` calls. The application continues to work using MongoDB for every query. Redis is a performance enhancement, not a hard dependency.

### Cache Invalidation

When `update()` is called in the repository, **all three cache keys** for that user are deleted:

```javascript
await cache.delete(`user:id:${id}`);
await cache.delete(`user:username:${user.username}`);
await cache.delete(`user:email:${user.email}`);
```

This ensures that after a profile update, the next request always reads fresh data from MongoDB.

---

## Repository Abstraction

**File:** `repositories/user.repository.js`

The repository is the **only** place in the codebase where Mongoose model methods are called. This means:

- If you ever need to swap MongoDB for another database, you only need to rewrite this single file.
- The service and controller layers never need to import Mongoose types or understand query syntax.

### Available Methods

| Method | Description | Cache? |
|--------|-------------|--------|
| `create(userData)` | Creates and saves a new User document | No |
| `findByEmail(email)` | Finds a user by email | No |
| `findByUsername(username)` | Finds a user by username | ✅ Yes |
| `findById(id)` | Finds a user by MongoDB `_id` | ✅ Yes |
| `checkExists(email, username)` | Returns a user if either email or username matches (used for duplicate detection) | No |
| `update(id, updates)` | Updates a user document and invalidates cache | Invalidates |
