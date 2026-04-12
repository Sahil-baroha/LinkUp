# LinkUp

> A LinkedIn clone for professionals — MERN stack, production-grade layered backend.

---

## Project Overview

LinkUp is a full-stack social networking platform. Users can register, post content, react to posts, comment, connect with other users, and view a personalized feed from their connections.

**Backend status:** Complete ✅  
**Frontend:** Next.js — in progress

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Express.js |
| Database | MongoDB via Mongoose |
| Cache | Redis via ioredis (optional) |
| Auth | Stateless JWT in HttpOnly cookies |
| Validation | Zod |
| Image storage | Cloudinary (posts) + Multer/disk (profile pictures) |
| Security | Helmet, CORS origin lock, express-rate-limit |
| Frontend | Next.js _(in progress)_ |

---

## Backend Structure

```
Backend/
├── controllers/        → HTTP layer
├── services/           → Business logic
├── repositories/       → Database + cache
├── models/             → Mongoose schemas
├── routes/             → URL definitions + middleware chains
├── middleware/         → auth, validation, upload, error handler
├── validators/         → Zod schemas
├── utils/              → errors, response, cache, cloudinary
└── server.js           → Entry point
```

---

## Architecture

```
Request → Middleware → Controller → Service → Repository → MongoDB / Redis
```

| Layer | Responsibility |
|-------|---------------|
| **Controller** | Reads `req`, calls service, sends response |
| **Service** | Business rules, throws typed errors |
| **Repository** | MongoDB queries + Redis cache |

Full explanation → [`docs/architecture.md`](docs/architecture.md)

---

## Implemented Modules

| Module | Routes prefix | Status |
|--------|--------------|--------|
| Auth (register / login / logout) | `/api/v1/auth` | ✅ |
| User (profile, search, deactivate) | `/api/v1/users` | ✅ |
| Connections (request / accept / reject / remove) | `/api/v1/connections` | ✅ |
| Posts (CRUD + image upload) | `/api/v1/posts` | ✅ |
| Likes (toggle, list) | `/api/v1/posts/:id/likes` | ✅ |
| Comments (CRUD) | `/api/v1/posts/:id/comments` | ✅ |
| Feed (cursor-paginated, enriched) | `/api/v1/feed` | ✅ |

---

## Getting Started

```bash
cd Backend
npm install
npm run dev
```

**`.env` file:**

```
MONGO_URL=mongodb+srv://...
JWT_SECRET=<long-random-string>
PORT=3000
CLIENT_URL=http://localhost:3001
REDIS_URL=redis://localhost:6379     # optional
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## Documentation

| File | What it covers |
|------|---------------|
| [`docs/architecture.md`](docs/architecture.md) | Layered architecture, middleware pipeline, request lifecycle, error propagation |
| [`docs/api.md`](docs/api.md) | All endpoints, request/response shapes, pagination |
| [`docs/database.md`](docs/database.md) | All models, indexes, repository methods |
| [`docs/redis-cache.md`](docs/redis-cache.md) | How Redis caching works — patterns, invalidation, fallback |
| [`docs/development.md`](docs/development.md) | How to add a new module, conventions, naming |
| [`docs/changelog.md`](docs/changelog.md) | Phase-by-phase build history |
