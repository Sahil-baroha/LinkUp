# 🛠️ LinkUp — Development Guide

> Conventions, patterns, and workflow for contributing to the LinkUp backend.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Environment Variables](#environment-variables)
3. [Project Structure](#project-structure)
4. [Layer Rules](#layer-rules)
5. [Adding a New Module](#adding-a-new-module)
6. [Validation Conventions](#validation-conventions)
7. [Error Handling](#error-handling)
8. [API Response Conventions](#api-response-conventions)
9. [Naming Conventions](#naming-conventions)

---

## Getting Started

**Prerequisites:** Node.js ≥ 18, MongoDB, Redis (optional)

```bash
cd Backend
npm install
npm run dev
```

Server starts on port `3000` by default.

---

## Environment Variables

```
MONGO_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/linkup
JWT_SECRET=<long-random-string>
PORT=3000
CLIENT_URL=http://localhost:3001     # CORS origin — required in production
REDIS_URL=redis://localhost:6379     # optional — app works without it
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Use a long, random string. Rotate if compromised. |
| `CLIENT_URL` | ✅ (production) | Restricts CORS to your frontend origin |
| `REDIS_URL` | ❌ | Omit entirely to run without cache |
| `CLOUDINARY_*` | ✅ (for posts with images) | Cloudinary credentials |

---

## Project Structure

```
Backend/
├── config/             → Cloudinary setup and other integrations
├── controllers/        → HTTP layer — reads req, calls service, sends response
├── services/           → Business logic layer
├── repositories/       → Database + cache layer
├── models/             → Mongoose schemas
├── routes/             → URL definitions and middleware chains
├── middleware/         → auth, validation, upload, error handler
├── validators/         → Zod input schemas
├── utils/              → Shared: errors.js, response.js, cache.js, cloudinary.js
└── server.js           → App entry point, global middleware, route mounting
```

---

## Layer Rules

The backend follows a strict layered architecture. Each layer has one job and communicates only with the layer directly below it.

```
Route → Middleware → Controller → Service → Repository → MongoDB / Redis
```

| Layer | Job | Must NOT |
|-------|-----|---------|
| Controller | Read `req`, call service, send response | Touch DB, contain business logic |
| Service | Enforce rules, throw typed errors | Import Mongoose, send HTTP responses |
| Repository | Run DB/cache queries | Contain business logic, know about `req`/`res` |

**Never skip layers.** A controller must not import a model directly. A service must not call `res.json()`.

---

## Adding a New Module

Follow these steps in order. Use the existing modules as reference.

### 1. Model (`models/`)

Define the Mongoose schema. Add indexes for any field you'll query on.

### 2. Repository (`repositories/`)

Only Mongoose calls here. Export a singleton:

```javascript
export class ThingRepository { ... }
export const thingRepo = new ThingRepository();
```

### 3. Service (`services/`)

Business logic only. Use the typed error classes. Strip sensitive fields before returning.

```javascript
import { thingRepo } from "../repositories/thing.repository.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

export class ThingService {
    async doSomething(userId, data) {
        const thing = await thingRepo.findById(data.id);
        if (!thing) throw new NotFoundError("Thing not found");
        if (thing.ownerId.toString() !== userId) throw new ForbiddenError("Not your thing");
        return thingRepo.update(data.id, data.updates);
    }
}
```

### 4. Controller (`controllers/`)

One line per operation — delegate everything to the service.

```javascript
import { asyncHandler } from "../middleware/error-handler.middleware.js";
import { ApiResponse } from "../utils/response.js";

export const doSomething = asyncHandler(async (req, res) => {
    const result = await thingService.doSomething(req.user.id, req.body);
    return ApiResponse.success(res, result, "Done");
});
```

### 5. Validator (`validators/`)

All fields wrapped in `body:` for the validation middleware.

```javascript
export const createThingSchema = z.object({
    body: z.object({
        name: z.string().min(1),
    }),
});
```

### 6. Routes (`routes/`)

Wire the middleware chain. Validation before authentication for public schemas; authentication before any protected handler.

```javascript
router.use(authenticate);
router.post("/", validate(createThingSchema), createThing);
```

### 7. Mount in `server.js`

```javascript
import thingRoutes from "./routes/thing.routes.js";
app.use("/api/v1/things", thingRoutes);
```

---

## Validation Conventions

- All schemas live in `validators/`.
- Fields are always wrapped in `body: z.object({...})`.
- For URL params, wrap in `params: z.object({...})` — use `.refine()` to validate ObjectId format.
- `validate(schema)` must come **before** business middleware (authenticate) on public routes to reject bad input cheaply.
- Optional fields in update endpoints get `.optional()`.

---

## Error Handling

Use the typed error classes from `utils/errors.js`:

| Class | HTTP Status | When to use |
|-------|-------------|-------------|
| `ValidationError` | 400 | Business-level rule failure (not caught by Zod) |
| `UnauthorizedError` | 401 | Missing/invalid token, wrong credentials |
| `ForbiddenError` | 403 | Authenticated but not the owner of a resource |
| `NotFoundError` | 404 | DB lookup returned null |
| `ConflictError` | 409 | Duplicate (email, username, connection request, like) |

**Never throw `new Error()` for a known case.** The global handler treats a plain `Error` as a 500 and hides the real reason.

**Never write `try/catch` in a controller.** `asyncHandler` wraps every controller function. Any thrown error is automatically forwarded to the global error handler.

---

## API Response Conventions

Always use `ApiResponse` from `utils/response.js`:

```javascript
// Success
ApiResponse.success(res, data, "Message");          // 200
ApiResponse.success(res, data, "Created", 201);     // 201

// Error (when manually responding from a controller — rare)
ApiResponse.error(res, "Something failed", 400);
```

Never call `res.json()` or `res.status(200).send()` directly in a controller.

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | `feature.layer.js` | `post.service.js` |
| Classes | PascalCase | `PostService` |
| Functions / methods | camelCase | `createPost` |
| Singleton exports | camelCase | `postRepo` |
| Error classes | PascalCase | `ForbiddenError` |
| Cache keys | `entity:field:value` | `user:id:abc123` |
| Routes | kebab-case | `/update_profile_picture` |
