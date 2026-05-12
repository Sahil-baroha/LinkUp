/**
 * auth.ts — Authentication API functions
 *
 * Source verified against:
 *   - routes/auth.routes.js
 *   - controllers/auth.controller.js
 *   - Login returns { user } in data — token is HttpOnly cookie only (C4)
 */

import apiClient from "./client";
import type { ApiResponse } from "@/types";
import type { User } from "@/types";

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Returns the created user object (no password).
 */
export async function register(data: RegisterPayload): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>("/auth/register", data);
  return res.data.data;
}

/**
 * POST /auth/login
 * Sets HttpOnly JWT cookie. Returns the authenticated user.
 * Source: auth.controller.js → data: { user } (token NOT in body — C4)
 */
export async function login(data: LoginPayload): Promise<User> {
  const res = await apiClient.post<ApiResponse<{ user: User }>>("/auth/login", data);
  return res.data.data.user;
}

/**
 * POST /auth/logout
 * Clears the JWT cookie server-side. Returns nothing meaningful.
 */
export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
