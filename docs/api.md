# 📡 LinkUp — API Reference

> Base URL prefix: `/api/v1`  
> All responses follow the standard shape: `{ success, message, data }`

---

## Table of Contents

1. [Standard Response Format](#standard-response-format)
2. [Authentication](#authentication)
3. [Auth Routes — `/auth`](#auth-routes)
4. [User Routes — `/users`](#user-routes)
5. [Connection Routes — `/connections`](#connection-routes)
6. [Post Routes — `/posts`](#post-routes)
7. [Feed Route — `/feed`](#feed-route)
8. [Error Reference](#error-reference)

---

## Standard Response Format

Every response — success or failure — uses the same shape:

```json
{
  "success": true,
  "message": "Human-readable description",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "What went wrong"
}
```

Validation errors (400) also include field-level detail:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

---

## Authentication

Protected routes require a valid JWT. Pass it in one of two ways:

| Method | Format |
|--------|--------|
| **Cookie** (recommended) | `token=<jwt>` — set automatically by `POST /auth/login` |
| **Header** | `Authorization: Bearer <jwt>` |

Token expiry: **1 hour**. No refresh token mechanism currently exists — the user must log in again.

---

## Auth Routes

**Prefix:** `/api/v1/auth`  
**Rate limited:** register and login — max 20 requests per IP per 15 minutes.

### POST /auth/register

Create a new account.

**Body:**

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Required, min 1 char |
| `username` | string | Required, min 3 chars, unique |
| `email` | string | Required, valid email, unique |
| `password` | string | Required, min 6 chars |

**Response — `201`:** User object (password excluded)

**Errors:** `400` validation failed · `409` email or username already exists

---

### POST /auth/login

Authenticate and receive a session cookie.

**Body:** `{ email, password }`

**Response — `200`:**
```json
{
  "data": {
    "user": { "_id": "...", "name": "...", ... },
    "token": "eyJ..."
  }
}
```
Also sets: `Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict`

**Errors:** `400` validation · `401` wrong credentials or deactivated account

---

### POST /auth/logout

Clear the session cookie.

**Auth required:** No  
**Response — `200`:** Cookie is cleared server-side.

---

## User Routes

**Prefix:** `/api/v1/users`  
All routes require authentication.

### GET /users/profile

Get the authenticated user's profile.

**Response — `200`:** User object

---

### PATCH /users/update

Update profile fields (name, username, email).

**Body:** All fields optional.

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Optional, min 1 char |
| `username` | string | Optional, min 3 chars |
| `email` | string | Optional, valid email |

**Errors:** `400` · `404` user not found · `409` username/email taken

---

### POST /users/update_profile_picture

Upload a profile photo.

**Content-Type:** `multipart/form-data`  
**Form field:** `profileImage`

**Response — `200`:** `{ profilePicture: "uploads/..." }`

**Errors:** `400` no file uploaded · `404` user not found

---

### DELETE /users/deactivate

Soft-delete the authenticated user's account. Sets `active = false`. The account cannot be reactivated via the API.

**Response — `200`:** Deactivated user object (without password)

---

### GET /users/search?q=&page=&limit=

Search users by name or username (case-insensitive, paginated).

**Query params:** `q` (required), `page` (default 1), `limit` (default 10)

**Response — `200`:**
```json
{
  "data": {
    "users": [...],
    "total": 42,
    "page": 1,
    "pages": 5
  }
}
```

---

## Connection Routes

**Prefix:** `/api/v1/connections`  
All routes require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get accepted connections |
| `GET` | `/requests` | Incoming pending requests |
| `GET` | `/sent` | Outgoing pending requests |
| `POST` | `/request/:userId` | Send a connection request |
| `PATCH` | `/accept/:requestId` | Accept an incoming request |
| `PATCH` | `/reject/:requestId` | Reject an incoming request |
| `DELETE` | `/withdraw/:requestId` | Cancel an outgoing request |
| `DELETE` | `/remove/:userId` | Remove an accepted connection |

**Business rules:**
- Cannot send a request to yourself
- Cannot send a duplicate request
- Only the receiver can accept or reject
- Only the sender can withdraw

---

## Post Routes

**Prefix:** `/api/v1/posts`  
All routes require authentication.

### Core CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/` | Create a post (text + optional image) |
| `GET` | `/:postId` | Get a single post |
| `GET` | `/user/:userId` | Get all posts by a user |
| `PATCH` | `/:postId` | Edit a post (author only) |
| `DELETE` | `/:postId` | Delete a post (author only, cascades to likes + comments) |

**Post body fields:**

| Field | Type | Rules |
|-------|------|-------|
| `body` | string | Required, max 3000 chars |
| `image` | file | Optional, `multipart/form-data`, field name `postImage` |

### Like Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/:postId/like` | Toggle like / unlike |
| `GET` | `/:postId/likes` | Paginated list of users who liked + total count |

### Comment Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/:postId/comments` | Paginated comment list |
| `POST` | `/:postId/comments` | Add a comment |
| `PATCH` | `/:postId/comments/:commentId` | Edit a comment (author only) |
| `DELETE` | `/:postId/comments/:commentId` | Delete a comment (author only) |

---

## Feed Route

**Prefix:** `/api/v1/feed`  
Requires authentication. Returns posts from accepted connections only.

### GET /feed

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cursor` | ISO date string | now | Fetch posts older than this timestamp |
| `limit` | number | 10 | Posts per page |

**Response — `200`:**
```json
{
  "data": {
    "posts": [
      {
        "_id": "...",
        "body": "...",
        "authorId": { "username": "...", "profilePicture": "..." },
        "likeCount": 5,
        "isLikedByMe": true,
        "commentCount": 2,
        "createdAt": "..."
      }
    ],
    "hasMore": true,
    "nextCursor": "2026-04-10T12:00:00.000Z"
  }
}
```

**How pagination works:** Pass `nextCursor` from the previous response as `cursor` in the next request. When `hasMore` is `false`, you have reached the end of the feed.

---

## Error Reference

| Status | Class | Meaning |
|--------|-------|---------|
| `400` | `ValidationError` | Invalid input |
| `401` | `UnauthorizedError` | Missing/expired token or wrong credentials |
| `403` | `ForbiddenError` | Authenticated but not allowed (e.g. editing another user's post) |
| `404` | `NotFoundError` | Resource doesn't exist |
| `409` | `ConflictError` | Duplicate (email, username, connection request) |
| `429` | — | Rate limit exceeded (auth routes) |
| `500` | — | Unexpected server error |
