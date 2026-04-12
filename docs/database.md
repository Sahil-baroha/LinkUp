# 🗄️ LinkUp — Database Reference

> All database access goes through `repositories/`. No other layer imports Mongoose models directly.

---

## Table of Contents

1. [Stack](#stack)
2. [Models Overview](#models-overview)
3. [User Model](#user-model)
4. [Post Model](#post-model)
5. [Connection Model](#connection-model)
6. [Like Model](#like-model)
7. [Comment Model](#comment-model)
8. [Indexes Summary](#indexes-summary)
9. [Repository Abstraction](#repository-abstraction)

---

## Stack

| Component | Technology |
|-----------|-----------|
| Database | MongoDB |
| ODM | Mongoose |
| Cache | Redis via `ioredis` (optional) |
| Image storage | Cloudinary (for post images) |
| File uploads | Multer (profile pictures stored locally in `uploads/`) |

---

## Models Overview

```
User ──< Post
User ──< Connection (as senderId or receiverId)
Post ──< Like
Post ──< Comment
User ──< Like
User ──< Comment
```

All relationships use MongoDB `ObjectId` references (`ref`). Mongoose `populate()` is used to join data at query time — there are no embedded documents between collections.

---

## User Model

**File:** `models/user.model.js` · **Collection:** `users`

| Field | Type | Required | Unique | Default |
|-------|------|----------|--------|---------|
| `name` | String | ✅ | — | — |
| `username` | String | ✅ | ✅ | — |
| `email` | String | ✅ | ✅ | — |
| `password` | String | ✅ | — | — |
| `active` | Boolean | — | — | `true` |
| `profilePicture` | String | — | — | `""` |
| `createdAt` / `updatedAt` | Date | — | — | auto |

**Key decisions:**
- `password` stores a bcrypt hash (10 rounds). Never plaintext.
- `active: false` is a soft-delete — the document stays in the database. Deactivated accounts cannot log in.
- `profilePicture` stores a local file path (`uploads/…`). Post images use Cloudinary instead.

---

## Post Model

**File:** `models/posts.model.js` · **Collection:** `posts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `authorId` | ObjectId (ref User) | ✅ | The creator of the post |
| `body` | String | ✅ | Max 3000 chars |
| `image.url` | String | — | Cloudinary URL, `null` if text-only |
| `image.publicId` | String | — | Cloudinary ID used to delete the image on post delete |
| `createdAt` / `updatedAt` | Date | — | auto |

**Indexes:**
- `{ authorId: 1, createdAt: -1 }` — fast "all posts by user, newest first" queries
- `{ createdAt: -1 }` — fast cursor-based feed queries across all posts

---

## Connection Model

**File:** `models/connections.model.js` · **Collection:** `connections`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `senderId` | ObjectId (ref User) | ✅ | Who sent the request |
| `receiverId` | ObjectId (ref User) | ✅ | Who received it |
| `status` | String (enum) | — | `"pending"` / `"accepted"` / `"rejected"`. Default: `"pending"` |
| `createdAt` / `updatedAt` | Date | — | auto |

**Indexes:**
- `{ senderId: 1, receiverId: 1 }` unique — prevents duplicate requests between the same pair at the DB level
- `{ senderId: 1, receiverId: 1, status: 1 }` — supports the feed query that resolves all accepted connections for a user

---

## Like Model

**File:** `models/like.model.js` · **Collection:** `likes`

| Field | Type | Required |
|-------|------|----------|
| `postId` | ObjectId (ref Post) | ✅ |
| `userId` | ObjectId (ref User) | ✅ |
| `createdAt` / `updatedAt` | Date | auto |

**Index:** `{ postId: 1, userId: 1 }` unique — one like per user per post, enforced at DB level.

**Design note:** Like count is never stored on the `Post` document. It is always derived from `Like.countDocuments({ postId })` or via aggregation. This avoids counter drift from concurrent writes.

---

## Comment Model

**File:** `models/comments.model.js` · **Collection:** `comments`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `postId` | ObjectId (ref Post) | ✅ | Indexed |
| `authorId` | ObjectId (ref User) | ✅ | — |
| `body` | String | ✅ | Max 1000 chars |
| `createdAt` / `updatedAt` | Date | — | auto |

**Index:** `{ postId: 1, createdAt: -1 }` — fast "all comments for a post, newest first" queries.

---

## Indexes Summary

| Collection | Index | Purpose |
|------------|-------|---------|
| `users` | `{ email: 1 }` | Login lookup |
| `users` | `{ username: 1 }` | Profile lookup / search |
| `posts` | `{ authorId: 1, createdAt: -1 }` | Posts by author, sorted |
| `posts` | `{ createdAt: -1 }` | Cursor-based feed |
| `connections` | `{ senderId, receiverId }` unique | Prevent duplicate requests |
| `connections` | `{ senderId, receiverId, status }` | Feed connection resolve |
| `likes` | `{ postId, userId }` unique | One like per user per post |
| `comments` | `{ postId, createdAt: -1 }` | Paginated comments per post |

---

## Repository Abstraction

Each collection has its own repository class. No other layer calls Mongoose directly.

| Repository | Caching |
|------------|---------|
| `UserRepository` | `findById`, `findByUsername` — 300s TTL. Invalidated on `update` and `softDelete`. |
| `PostRepository` | None |
| `ConnectionRepository` | None |
| `LikeRepository` | None — includes batch aggregation for feed enrichment |
| `CommentRepository` | None — includes batch count aggregation for feed enrichment |
| `FeedRepository` | Coordinates the other 4 repositories in 4 constant DB queries |

→ See [redis-cache.md](./redis-cache.md) for a full explanation of how the cache layer works.
