/**
 * client.ts — Shared Axios instance
 *
 * Rules (from AGENTS.md):
 *   - Always use this instance — never inline fetch() in components
 *   - withCredentials: true is non-negotiable (HttpOnly cookie transport)
 *   - 401 interceptor: clear auth store → redirect to /login → show toast
 *
 * Interceptor notes:
 *   - Dynamic import for auth store avoids circular dependency
 *     (client.ts → auth-store.ts → client.ts cycle)
 *   - Checks window.location.pathname before redirecting to prevent
 *     a redirect loop when already on /login
 *   - typeof window check guards against SSR execution
 */

import axios from "axios";
import { toast } from "sonner";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipRateLimitToast?: boolean;
  }
}

const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/v1`,
  withCredentials: true, // Required — HttpOnly cookies won't send without this
  headers: {
    "Content-Type": "application/json",
  },
});

let lastRateLimitToastTime = 0;
const RATE_LIMIT_TOAST_COOLDOWN_MS = 2000;

function showRateLimitToast(retryAfterHeader?: string | number) {
  const now = Date.now();
  if (now - lastRateLimitToastTime < RATE_LIMIT_TOAST_COOLDOWN_MS) {
    return;
  }
  lastRateLimitToastTime = now;

  const seconds = parseInt(String(retryAfterHeader), 10);
  const message =
    Number.isFinite(seconds) && seconds > 0
      ? `Too many requests. Try again in ${seconds} seconds`
      : "Too many requests. Try again later";

  toast.error(message, { id: "rate-limit-429" });
}

// ─── Response Interceptor ───────────────────────────────────────────────────

apiClient.interceptors.response.use(
  // Pass-through on success
  (response) => response,

  async (error) => {
    const status = error.response?.status;

    if (status === 401 && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

      // Guard: don't redirect if already on login (prevents redirect loop)
      if (!currentPath.startsWith("/login")) {
        try {
          // Dynamic import prevents circular dependency:
          // client.ts would otherwise depend on auth-store.ts which imports client.ts
          const { useAuthStore } = await import("@/store/auth-store");
          useAuthStore.getState().clearAuth();
        } catch {
          // Store may not be initialised yet during early app load — safe to ignore
        }

        toast.error("Your session has expired. Please sign in again.");
        // Hard navigate so middleware re-evaluates cookie state cleanly
        window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
      }
    }

    if (status === 429 && typeof window !== "undefined") {
      if (!error.config?.skipRateLimitToast) {
        const retryAfter =
          error.response?.headers?.["retry-after"] ??
          error.response?.headers?.["Retry-After"];
        showRateLimitToast(retryAfter);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
