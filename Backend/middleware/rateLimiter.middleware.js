/**
 * Rate-limiter middleware definitions for LinkUp.
 *
 * All limiters share:
 *  - standardHeaders: true  (RateLimit-* draft-7 headers)
 *  - legacyHeaders:   false (no X-RateLimit-* headers)
 *  - passOnStoreError: true (allow request through on store failure)
 *  - Custom handler:  returns ApiResponse.error(res, msg, 429)
 *    ERL 8 automatically sets Retry-After when it invokes the handler.
 *  - One ResilientStore per limiter instance (prefix = "rl:<name>:")
 *
 * User-keyed limiters fall back to IP key when req.user is absent.
 * IP keys use ipKeyGenerator() for IPv6 safety.
 */

import { createHash } from "crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { ApiResponse } from "../utils/response.js";
import { ResilientStore } from "../utils/rateLimitStore.js";

// ---------------------------------------------------------------------------
// Shared handler — ERL 8 already sets Retry-After before calling handler
// ---------------------------------------------------------------------------
function limitHandler(req, res, next, options) {
  return ApiResponse.error(res, "Too many requests, please try again later.", 429);
}

// ---------------------------------------------------------------------------
// Key-generator helpers
// ---------------------------------------------------------------------------

/** Safe IP key (handles IPv6 subnetting). */
function ipKey(req) {
  return ipKeyGenerator(req.ip ?? "unknown");
}

/** User-id key with IP fallback. */
function userKey(req) {
  if (req.user?.id) return String(req.user.id);
  return ipKey(req);
}

/**
 * First 32 hex chars of SHA-256(email.trim().toLowerCase()).
 * Falls back to IP if email is missing or not a string.
 * Never logs the email value.
 */
function emailKey(req) {
  const email = req.body?.email;
  if (typeof email === "string" && email.length > 0) {
    return createHash("sha256")
      .update(email.trim().toLowerCase())
      .digest("hex")
      .slice(0, 32);
  }
  return ipKey(req);
}

// ---------------------------------------------------------------------------
// 1. authIp — 20 req / 15 min by IP
//    Applied to: POST /auth/register  and  POST /auth/login
// ---------------------------------------------------------------------------
export const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientStore("rl:authIp:"),
  keyGenerator: ipKey,
  handler: limitHandler,
});

// ---------------------------------------------------------------------------
// 2. loginAccount — 10 FAILED attempts / 15 min by hashed email
//    Applied to: POST /auth/login only
//    skipSuccessfulRequests: true means only failed (4xx/5xx) responses count
// ---------------------------------------------------------------------------
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  skipSuccessfulRequests: true,
  store: new ResilientStore("rl:loginAccount:"),
  keyGenerator: emailKey,
  handler: limitHandler,
});

// ---------------------------------------------------------------------------
// 3. write — 60 non-GET mutations / minute by user id
//    Applied to: post and connection routers (skip GET/HEAD/OPTIONS)
// ---------------------------------------------------------------------------
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientStore("rl:write:"),
  keyGenerator: userKey,
  skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
  handler: limitHandler,
});

// ---------------------------------------------------------------------------
// 4. postCreate — 20 POST /posts per 15 min by user id
// ---------------------------------------------------------------------------
export const postCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientStore("rl:postCreate:"),
  keyGenerator: userKey,
  handler: limitHandler,
});

// ---------------------------------------------------------------------------
// 5. search — 30 / minute by user id on GET /users/search
// ---------------------------------------------------------------------------
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientStore("rl:search:"),
  keyGenerator: userKey,
  handler: limitHandler,
});

// ---------------------------------------------------------------------------
// 6. read — 120 / minute by user id on GET /feed and GET posts/connections
// ---------------------------------------------------------------------------
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new ResilientStore("rl:read:"),
  keyGenerator: userKey,
  handler: limitHandler,
});

// ---------------------------------------------------------------------------
// Legacy export — authLimiter kept for backward compatibility.
// auth.routes.js currently imports authLimiter; L3 will update that import,
// but keeping this alias means nothing breaks if any other importer exists.
// ---------------------------------------------------------------------------
export const authLimiter = authIpLimiter;
