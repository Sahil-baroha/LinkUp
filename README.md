# LinkUp

> A LinkedIn clone for professionals — built with the MERN stack using a production-grade layered backend architecture.

---

## Project Overview

LinkUp is a full-stack social networking platform inspired by LinkedIn. It allows users to:

- Register and authenticate with secure JWT-based sessions
- Upload and manage profile pictures
- Update their professional profile
- _(Coming soon)_ create and share posts, and build a professional connections network

The project is built incrementally using the MERN stack (MongoDB, Express, React/Next.js, Node.js).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js (ESM) |
| **Framework** | Express.js |
| **Database** | MongoDB via Mongoose |
| **Cache** | Redis (optional, graceful fallback) |
| **Auth** | Stateless JWT stored in HttpOnly cookies |
| **Validation** | Zod |
| **File Uploads** | Multer (disk storage) |
| **Frontend** | Next.js _(in progress)_ |

---

## Backend Structure

```
Backend/
├── controllers/        → HTTP request handlers (thin, delegate to services)
├── services/           → Business logic (hashing, tokens, rules)
├── repositories/       → Database abstraction + Redis cache layer
├── models/             → Mongoose schemas
├── routes/             → URL definitions and middleware chains
├── middleware/         → Auth, validation, error handling
├── validators/         → Zod input schemas
├── utils/              → Shared helpers (errors, response, cache)
└── server.js           → App entry point
```

---

## Architecture Overview

The backend follows a **Separation of Concerns** pattern with three distinct layers:

```
HTTP Request
    │
    ▼
Middleware  →  Controller  →  Service  →  Repository  →  MongoDB / Redis
```

Each layer has a single responsibility:

| Layer | Responsibility |
|-------|---------------|
| **Controller** | Reads from `req`, calls the service, sends the response |
| **Service** | Enforces business rules, throws typed errors |
| **Repository** | Runs database queries per MongoDB/Redis |

→ **Deep dive:** [`docs/architecture.md`](Backend/docs/architecture.md)

---

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd linkup/Backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env  # then fill in the values

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the `Backend/` directory:

```
MONGO_URL=<your-mongodb-uri>
JWT_SECRET=<your-long-secret-key>
PORT=3000
REDIS_URL=redis://localhost:6379   # optional
```

→ See [`docs/development.md`](docs/development.md) for full setup details.

---

## Available Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/users/register` | ❌ | Create a new account |
| `POST` | `/api/v1/users/login` | ❌ | Login and receive session token |
| `POST` | `/api/v1/users/user_update` | ✅ | Update profile fields |
| `POST` | `/api/v1/users/update_profile_picture` | ✅ | Upload a profile image |

→ Full API reference: [`docs/api.md`](docs/api.md)

---

## Documentation Guide

| Document | What it covers |
|----------|---------------|
| [`docs/architecture.md`](docs/architecture.md) | Layered architecture, middleware pipeline, request lifecycle, error propagation, cache-aside pattern |
| [`docs/api.md`](docs/api.md) | All API endpoints, request shapes, response formats, validation rules |
| [`docs/database.md`](docs/database.md) | Mongoose models, indexes, Redis caching, repository methods |
| [`docs/development.md`](docs/development.md) | Project conventions, how to add a new endpoint, error and response patterns |
| [`docs/changelog.md`](docs/changelog.md) | Phase-by-phase history of major changes |

---

## Development Workflow

The project is built in phases. Each phase introduces a new feature module.

- **Phase 1** — Initial Express + MongoDB setup
- **Phase 2** — User module with full layered architecture ✅ _(current)_
- **Phase 3** — Posts module _(planned)_
- **Phase 4** — Connections / follows _(planned)_
- **Phase 5** — Notifications and feed _(planned)_

→ See [`docs/changelog.md`](docs/changelog.md) for full phase history.
