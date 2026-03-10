# 📡 LinkUp — API Reference

> All endpoints are prefixed with `/api/v1/users`. All responses follow a standardized shape.

---

## Table of Contents

1. [Standard Response Format](#standard-response-format)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
   - [POST /register](#post-register)
   - [POST /login](#post-login)
   - [POST /update_profile_picture](#post-update_profile_picture)
   - [POST /user_update](#post-user_update)
4. [Error Responses](#error-responses)
5. [Validation Rules](#validation-rules)

---

## Standard Response Format

Every response from this API — success or failure — follows the same JSON shape:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... }
}
```

This is enforced by the `ApiResponse` utility (`utils/response.js`). Controllers never build their own JSON objects; they always go through this formatter.

**Why standardize?** A consistent shape means frontend code can always find the data in the same place and can always check `success` before trying to read `data`.

---

## Authentication

Protected endpoints require a valid JWT token. The token can be sent in two ways:

| Method | Format |
|--------|--------|
| **Cookie** (recommended) | `token=<jwt>` set automatically on login |
| **Header** | `Authorization: Bearer <jwt>` |

The `authenticate` middleware reads from the cookie first, then falls back to the `Authorization` header. If neither is present or the token is invalid, a `401 Unauthorized` error is returned.

> **Token Expiry:** Tokens expire after **1 hour**. There is currently no refresh token mechanism — the user must log in again.

---

## Endpoints

### POST /register

Creates a new user account.

**Auth required:** No

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | ✅ | At least 1 character |
| `username` | string | ✅ | At least 3 characters, must be unique |
| `email` | string | ✅ | Valid email format, must be unique |
| `password` | string | ✅ | At least 6 characters |

```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepass"
}
```

**Success Response — `201 Created`:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "6640e3a1c...",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "active": true,
    "profilePicture": "",
    "createdAt": "2026-03-10T...",
    "updatedAt": "2026-03-10T..."
  }
}
```

> **Note:** The `password` field is **never** returned in any response. It is stripped in the service layer before the object reaches the controller.

**Possible Errors:**

| Status | Reason |
|--------|--------|
| `400` | Validation failed (missing or invalid fields) |
| `409` | Email or username already exists |

---

### POST /login

Authenticates an existing user and sets a session cookie.

**Auth required:** No

**Request Body:**

| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

```json
{
  "email": "john@example.com",
  "password": "securepass"
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": { "_id": "...", "name": "John Doe", ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

The server also sets a `Set-Cookie` header with the token:
```
Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
```

> **Security note:** `HttpOnly` prevents JavaScript from reading the cookie. `SameSite=Strict` prevents CSRF attacks.

**Possible Errors:**

| Status | Reason |
|--------|--------|
| `400` | Validation failed |
| `404` | No user found with that email |
| `401` | Email found but password does not match |

---

### POST /update_profile_picture

Uploads and sets the authenticated user's profile picture.

**Auth required:** Yes (`authenticate` middleware)

**Content-Type:** `multipart/form-data`

**Form field:** `profileImage` (the image file)

Files are stored in the `uploads/` folder on the server. The stored file path is saved to the user's `profilePicture` field.

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profilePicture": "uploads/1710077400000-avatar.png"
  }
}
```

**Possible Errors:**

| Status | Reason |
|--------|--------|
| `400` | No file was included in the request |
| `401` | Missing or invalid token |
| `404` | Authenticated user not found in database |

---

### POST /user_update

Updates the authenticated user's profile fields.

**Auth required:** Yes (`authenticate` middleware)

**Request Body** (all fields are optional):

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | At least 1 character |
| `username` | string | At least 3 characters |
| `email` | string | Valid email format |

```json
{
  "name": "Jane Doe",
  "username": "janedoe"
}
```

**Success Response — `200 OK`:**

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "_id": "...",
    "name": "Jane Doe",
    "username": "janedoe",
    "email": "john@example.com",
    ...
  }
}
```

**Possible Errors:**

| Status | Reason |
|--------|--------|
| `400` | Validation failed |
| `401` | Missing or invalid token |
| `404` | Authenticated user not found |
| `409` | New email or username is already taken by another account |

---

## Error Responses

All errors follow the same standardized format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Validation errors (status `400`) include a field-level `errors` array:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

---

## Validation Rules

Validation is enforced by **Zod** schemas before the request reaches the controller. If validation fails, the request is rejected at the middleware layer — the controller never executes.

| Schema | Used by | Fields validated |
|--------|---------|-----------------|
| `registerSchema` | `POST /register` | `name`, `username`, `email`, `password` |
| `loginSchema` | `POST /login` | `email`, `password` |
| `updateProfileSchema` | `POST /user_update` | `name`, `username`, `email` (all optional) |

See → [`validators/user.validator.js`](../validators/user.validator.js)
