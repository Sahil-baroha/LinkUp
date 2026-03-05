# LinkUp

LinkUp is a full-stack LinkedIn clone that allows users to create profiles, connect with professionals, share posts, and build a professional network. Built using the MERN stack with authentication, media uploads, and PDF resume generation.

**Tags:** `mern` `mongodb` `express` `next` `social-network` `linkedin-clone` `authentication` `jwt` `fullstack-project` `web-development`

---

## Architecture Changelog

### v1.1.0 — User Module Refactoring (March 2026)

**Summary:** Restructured the User module from a monolithic controller pattern to a production-grade **Layered Architecture** (Controller → Service → Repository) following enterprise Node.js backend standards.

#### What Changed

| Area | Before | After |
|------|--------|-------|
| **Architecture** | Single controller with mixed concerns | Controller → Service → Repository separation |
| **Authentication** | JWT logic embedded in each controller | Stateless JWT middleware (`auth.middleware.js`) |
| **Validation** | Manual `if/else` checks | Zod schemas + validation middleware |
| **Error Handling** | Per-function `try/catch` blocks | Global error handler + custom error classes |
| **API Responses** | Inconsistent JSON shapes | Standardized `ApiResponse` utility |
| **Caching** | None | Redis cache layer at the repository level |
| **Database** | No indexes on query-heavy fields | Compound indexes on `email` and `username` |

#### New Files Introduced

- `services/user.service.js` — Business logic (password hashing, token generation, authorization)
- `repositories/user.repository.js` — Database abstraction with Redis cache-aside pattern
- `middleware/auth.middleware.js` — Stateless JWT authentication
- `middleware/validation.middleware.js` — Zod schema enforcement
- `middleware/error-handler.middleware.js` — Centralized error catching
- `validators/user.validator.js` — Input schemas for register, login, and profile update
- `utils/errors.js` — Custom error classes (`NotFoundError`, `ConflictError`, etc.)
- `utils/response.js` — Standardized API response formatter
- `utils/cache.js` — Redis caching service with graceful fallback

#### Impact

- Controller code reduced by **83%** (181 → 30 lines)
- All endpoints now return consistent `{ success, message, data }` responses
- Business logic is fully decoupled from HTTP and database layers
- System is prepared for horizontal scaling with stateless auth and cache-first reads

---

## Getting Started

```bash
cd Backend
npm install
npm run dev
```

Ensure the following environment variables are set in `.env`:

```
MONGO_URL=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
PORT=3000
REDIS_URL=<optional-redis-uri>
```
