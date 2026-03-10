# 🛠️ LinkUp — Development Guide

> A practical reference for developers contributing to the LinkUp backend. Covers the project conventions, request flow, and contribution patterns to follow.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Environment Variables](#environment-variables)
3. [Project Conventions](#project-conventions)
4. [Request Lifecycle at a Glance](#request-lifecycle-at-a-glance)
5. [Adding a New Endpoint](#adding-a-new-endpoint)
6. [Validation Conventions](#validation-conventions)
7. [Error Handling Conventions](#error-handling-conventions)
8. [API Response Conventions](#api-response-conventions)
9. [Code Style Notes](#code-style-notes)

---

## Getting Started

**Prerequisites:**
- Node.js ≥ 18
- MongoDB (Atlas cloud or local)
- Redis (optional — app works without it)

**Install and run:**

```bash
cd Backend
npm install
npm run dev
```

The server starts on port `3000` by default (configurable via `PORT` in `.env`).

---

## Environment Variables

Create a `.env` file in the `Backend/` directory:

```
MONGO_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/linkup
JWT_SECRET=<your-secret-key-min-32-chars>
PORT=3000
REDIS_URL=redis://localhost:6379   # optional
```

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing and verifying JWTs. Use a long, random string in production. |
| `PORT` | ❌ | Server port (defaults to `3000`) |
| `REDIS_URL` | ❌ | Redis connection string. If omitted, caching is silently disabled. |

---

## Project Conventions

### Layered Architecture

Every feature follows the same three-layer structure:

```
routes/         → defines URL + middleware chain
controllers/    → handles HTTP, delegates to service
services/       → business rules, throws typed errors
repositories/   → database (and cache) access only
models/         → Mongoose schema definition
validators/     → Zod input schemas
middleware/     → auth, validation, error handling
utils/          → shared helpers (errors, response, cache)
```

**The rule:** Each layer only communicates with the layer directly below it.
- Controllers call Services
- Services call Repositories
- Repositories call Mongoose models and the CacheService

Never skip layers — no controller should import a Mongoose model directly.

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `user.service.js` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase | `updateProfile` |
| Error classes | PascalCase | `NotFoundError` |
| Cache keys | `entity:field:value` | `user:id:abc123` |

---

## Request Lifecycle at a Glance

When a request comes in, it passes through these stages in order:

```
1. Global middleware (cors, express.json, cookieParser)  — server.js
2. Route-specific middleware (validate, authenticate)     — routes/
3. Controller function                                    — controllers/
4. Service method                                        — services/
5. Repository method → MongoDB / Redis                   — repositories/
6. Response flows back up
7. (on error) Global error handler catches and responds  — middleware/
```

---

## Adding a New Endpoint

Follow this checklist whenever you add a new endpoint:

### 1. Define the Zod schema (validators/)

```javascript
// validators/user.validator.js
export const myNewSchema = z.object({
    body: z.object({
        fieldName: z.string().min(1, "Field is required"),
    }),
});
```

### 2. Add the repository method (repositories/)

Only write Mongoose queries here. Return the raw Mongoose document.

```javascript
// repositories/user.repository.js
async findByField(value) {
    return await User.findOne({ field: value });
}
```

### 3. Add the service method (services/)

Write the business logic: validation rules, transformations, authorization checks, error throwing.

```javascript
// services/user.service.js
async myOperation(data) {
    const result = await this.userRepository.findByField(data.field);
    if (!result) throw new NotFoundError("Resource not found");
    const { password, ...safe } = result.toObject();
    return safe;
}
```

### 4. Add the controller method (controllers/)

Keep it thin. Delegate to the service, then send the response.

```javascript
// controllers/user.controller.js
export const myEndpoint = asyncHandler(async (req, res) => {
    const result = await userService.myOperation(req.body);
    return ApiResponse.success(res, result, "Operation successful");
});
```

### 5. Add the route (routes/)

Wire up the middleware chain and the controller function.

```javascript
// routes/user.routes.js
router.route('/my-endpoint').post(validate(myNewSchema), authenticate, myEndpoint);
```

---

## Validation Conventions

- All validation schemas live in `validators/user.validator.js`
- Schemas always wrap fields in a `body` object: `z.object({ body: z.object({...}) })`
- The `validate(schema)` middleware must come **before** `authenticate()` in the middleware chain — reject bad input before spending time on JWT verification
- If a field is optional in an update endpoint, add `.optional()` to the Zod field

---

## Error Handling Conventions

Use the custom error classes from `utils/errors.js` in the service layer:

| Error Class | HTTP Status | When to use |
|------------|-------------|-------------|
| `ValidationError` | 400 | Input fails a rule that Zod doesn't cover (business-level validation) |
| `NotFoundError` | 404 | A database lookup returns `null` |
| `UnauthorizedError` | 401 | Invalid credentials or missing token |
| `ForbiddenError` | 403 | Authenticated, but not allowed to access this resource |
| `ConflictError` | 409 | Duplicate data (email, username, etc.) |

**Never throw a generic `new Error()` for known scenarios.** A generic error will be caught by the error handler and returned as a `500`, hiding the real problem.

**Never use `try/catch` inside controllers.** The `asyncHandler` wrapper does this for you. Any thrown error anywhere in the async chain is automatically caught and forwarded to the global error handler.

---

## API Response Conventions

Always use `ApiResponse` from `utils/response.js`:

```javascript
// Success
return ApiResponse.success(res, data, "Message", statusCode); // statusCode defaults to 200

// Error (use only if you need to manually send an error from the controller)
return ApiResponse.error(res, "Error message", statusCode);
```

Never call `res.json()` or `res.status().send()` directly in a controller. This ensures consistent response shapes across the entire API.

---

## Code Style Notes

- Use **ES Modules** (`import`/`export`), not CommonJS (`require`/`module.exports`)
- Use **`async/await`** over `.then().catch()` chains
- The `asyncHandler` wrapper eliminates the need for `try/catch` in controllers
- Always strip the `password` field from user objects before returning them from a service method
- Services should be classes, repositories should be classes (for consistency and testability)
