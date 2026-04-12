# 📋 LinkUp — Changelog

> Phase-by-phase history of everything built. Most recent first.

---

## Phase 6 — Security & Audit (`chore/audit-fixes`) — PR #6

**Merged into:** `main`  
**Focus:** Hardening the entire backend before it is considered production-ready.

### Security

- Added **Helmet** (`helmet()`) — sets security HTTP headers out of the box: `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, and others.
- **CORS** locked to `process.env.CLIENT_URL` — previously `cors()` was called with no options, allowing any origin.
- **Rate limiting** on auth routes (`POST /auth/register` and `POST /auth/login`) — max 20 requests per IP per 15 minutes using `express-rate-limit`. Prevents brute-force attacks.
- JWT generation moved to an ES2022 **private class method** (`#generateToken`) — not accessible outside the class.
- Login now checks `user.active` — deactivated accounts are rejected with `401`.

### Cache Fixes

- **Object serialization fixed** — repositories now call `.toObject()` before caching. Previously a raw Mongoose document was serialized, leading to `TypeError` when cache-hit results were used as Mongoose documents downstream.
- **`KEYS` replaced with `SCAN`** — `redis.keys()` is a blocking O(N) command. Replaced with `redis.scanStream()` which is non-blocking and safe for production.

### Validation

- Added missing `param` validation across routes — previously some URL params (like `:postId`, `:userId`) were not validated before reaching the controller.
- Update endpoints now enforce **non-empty body** — sending an empty `{}` would previously result in a no-op database call.

### Post Module

- Legacy post controller removed; repository updated to use `.lean()` consistently for better performance.
- Cascade delete fully wired — deleting a post now correctly removes all associated likes and comments.

### Standardization

- API responses standardized across all remaining controllers — all now go through `ApiResponse`.
- Comment and like service logic cleaned up and made consistent.

---

## Phase 5 — Feed Module (`feature/feed`) — PR #5

**Merged into:** `main`

Introduced the personalized connection feed — the core social feature.

### What was built

- `FeedService.getFeed()` — orchestrates feed generation in **4 constant DB queries**, regardless of how many posts exist.
- Algorithm:
  1. Resolve accepted connection IDs for the current user
  2. Fetch `limit + 1` posts (cursor-based pagination, no `COUNT` queries)
  3. Batch-fetch like counts + "liked by me" flags via a single aggregation
  4. Batch-fetch comment counts
  5. Merge enrichment data onto post objects using O(1) `Map` lookups

- `FeedRepository` — thin coordination hub, delegates each step to the correct feature repository.
- Cursor-based pagination — instead of `?page=2`, the client sends a `cursor` (ISO timestamp of the last seen post). This avoids the "page drift" problem where new posts shift results between page loads.

### Connection model updated

- Added a compound index `{ senderId, receiverId, status }` to support the feed query that finds all accepted connections for a user efficiently.

---

## Phase 4 — Comment System (`feature/comment-system`) — PR #4

**Merged into:** `main`

Full comment CRUD plugged into the existing post routes.

### What was built

- `Comment` model — `postId` (ref Post), `authorId` (ref User), `body` (max 1000 chars), timestamps. Indexed on `{ postId, createdAt: -1 }`.
- `CommentRepository` — `create`, `findByPost` (paginated), `findById`, `update`, `delete`, `deleteCommentsByPost` (cascade), `getCommentCountsBatch` (aggregation for feed).
- `CommentService` — ownership check before edit/delete. Only the comment's author can modify it.
- `CommentController` — 4 handlers: `getComments`, `addComment`, `editComment`, `deleteComment`.
- Routes nested under `/posts/:postId/comments`.
- Cascade delete wired: deleting a post calls `deleteCommentsByPost` before removing the post document.

---

## Phase 3 — Like System (`feature/like-system`) — PR #3

**Merged into:** `main`

Toggle-based like system with batch aggregation for the feed.

### What was built

- `Like` model — `{ postId, userId }` with a **compound unique index** `{ postId, userId }` — the database enforces one-like-per-user-per-post at the storage level.
- `LikeRepository` — includes `findOneAndDeleteLike` (atomic unlike to prevent TOCTOU race), `getLikeCount`, `getLikesByPost` (paginated with user population), `getLikeAndMeDataBatch` (single aggregation returning like count + "liked by me" flag for a batch of posts).
- `LikeService` — toggle logic: if a like document exists → unlike, otherwise → like.
- Routes: `POST /:postId/like` (toggle), `GET /:postId/likes` (list).

---

## Phase 2 — Post Module (`feature/post-model`) — PR #2

**Merged into:** `main`

Core content creation.

### What was built

- `Post` model — `authorId` (ref User), `body` (max 3000 chars), `image { url, publicId }`. Indexed on `{ authorId, createdAt: -1 }` and `{ createdAt: -1 }`.
- **Cloudinary integration** (`utils/cloudinary.js`) — images uploaded via Multer are stored in Cloudinary. The `publicId` is stored so images can be deleted when the post is removed.
- `PostRepository` — `create`, `findById`, `findByAuthor`, `update`, `delete`, `getFeedPosts` (cursor-based, `limit + 1` trick).
- `PostService` — authorization: only the post author can edit or delete. Handles Cloudinary upload and deletion.
- Full CRUD routes under `/api/v1/posts`.

---

## Phase 1 — Connection System (`feature/connection-system`) — PR #1

**Merged into:** `main`

The social graph that powers the feed and defines who is "connected".

### What was built

- `Connection` model — `{ senderId, receiverId, status }` where status is `"pending" | "accepted" | "rejected"`. Unique compound index `{ senderId, receiverId }` prevents duplicate requests.
- `ConnectionRepository` — `sendRequest`, `findRequest`, `acceptRequest`, `rejectRequest`, `withdrawRequest`, `removeConnection`, `getMyConnections`, `getIncomingRequests`, `getOutgoingRequests`, `getAcceptedConnectionIds`.
- `ConnectionService` — business rules such as: you cannot send a request to yourself, you cannot accept a request you sent, you cannot send a duplicate request.
- 8 routes covering the full connection lifecycle.

---

## Phase 0 — User Module Refactor (v1.1.0 — March 2026)

**Foundation:** Restructured the entire backend from a monolithic controller into a production-grade layered architecture.

### What changed

| Area | Before | After |
|------|--------|-------|
| Architecture | Single fat controller | Controller → Service → Repository |
| Auth | JWT logic inline | Stateless JWT middleware |
| Validation | Manual `if/else` | Zod schemas + middleware |
| Error handling | Per-function `try/catch` | Global handler + typed errors |
| API responses | Inconsistent JSON | Standardized `ApiResponse` |
| Caching | None | Redis cache-aside pattern |
| Database | No indexes | Indexes on `email`, `username` |

### New files introduced

| File | Purpose |
|------|---------|
| `services/auth.service.js` | Register, login, logout business logic |
| `services/user.service.js` | Profile management, search |
| `repositories/user.repository.js` | DB abstraction + Redis cache |
| `middleware/auth.middleware.js` | JWT verification |
| `middleware/validation.middleware.js` | Zod schema enforcement |
| `middleware/error-handler.middleware.js` | Global error catcher + `asyncHandler` |
| `validators/user.validator.js` | Input schemas |
| `utils/errors.js` | Typed error classes |
| `utils/response.js` | `ApiResponse` formatter |
| `utils/cache.js` | `CacheService` Redis wrapper |
