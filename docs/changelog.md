# 📋 LinkUp — Changelog

> Documents all major and minor changes to the project, organized by phase or release.

---

## Phase 1 — Initial Backend Structure _(Pre-v1.1.0)_

**Setup:** Express server with basic MongoDB connection, single user controller with mixed concerns.

- Monolithic controller handling auth, validation, and database queries in one function
- Basic JWT logic embedded directly in each controller method
- Manual `if/else` validation without schema enforcement
- No caching layer, no standardized API response format
- No centralized error handling — each route had isolated `try/catch` blocks

---

## Phase 2 — User Module Refactor _(v1.1.0 — March 2026)_

**Summary:** Complete restructuring of the User module into a production-grade layered architecture.

### Architecture

- Introduced **Controller → Service → Repository** separation of concerns
- Controller reduced from ~181 lines to 30 lines (83% reduction)
- Business logic is now fully decoupled from HTTP and database layers

### Authentication

- Replaced inline JWT logic with a dedicated `auth.middleware.js`
- Stateless JWT stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies
- Token expiry: 1 hour

### Validation

- Added `validators/user.validator.js` with three Zod schemas: `registerSchema`, `loginSchema`, `updateProfileSchema`
- Added `middleware/validation.middleware.js` to enforce schemas before the controller is reached
- Validation errors now return field-level details in the response

### Error Handling

- Added `utils/errors.js` with a typed error hierarchy:
  - `AppError` (base)
  - `ValidationError` (400)
  - `NotFoundError` (404)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `ConflictError` (409)
- Added `middleware/error-handler.middleware.js` as a global error catcher
- All controllers now use `asyncHandler` wrapper — no individual `try/catch` required

### API Responses

- Added `utils/response.js` (`ApiResponse`) to enforce a consistent `{ success, message, data }` shape on all responses

### Caching

- Added `utils/cache.js` (`CacheService`) — Redis wrapper with graceful fallback if no Redis URL is configured
- Implemented **Cache-Aside pattern** in the repository for `findById` and `findByUsername`
- Cache TTL: 300 seconds per key
- Cache invalidation on `update()` across all three cache keys

### Database

- Added compound indexes on `email` and `username` for faster login and profile lookups

### New Files Added

| File | Purpose |
|------|---------|
| `services/user.service.js` | Business logic (hashing, token generation, authorization) |
| `repositories/user.repository.js` | MongoDB abstraction + Redis cache-aside |
| `middleware/auth.middleware.js` | Stateless JWT validation |
| `middleware/validation.middleware.js` | Zod schema enforcement |
| `middleware/error-handler.middleware.js` | Global error catching + asyncHandler |
| `validators/user.validator.js` | Input schemas for register, login, profile update |
| `utils/errors.js` | Custom typed error classes |
| `utils/response.js` | Standardized API response formatter |
| `utils/cache.js` | Redis caching service |

---

_Future phases will be documented here as they are implemented._
