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
    __retryCount?: number;
  }
}

const apiClient = axios.create({
  baseURL: "/api/v1",
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

// ─── Waking-up UX Helpers ───────────────────────────────────────────────────

const WAKE_UP_TOAST_ID = "server-waking-up";
const MAX_WAKE_UP_RETRIES = 3;
const WAKE_UP_RETRY_DELAY_MS = 4000;

let activeWakingRequests = 0;

function showWakeUpToast() {
  if (typeof window !== "undefined") {
    toast.loading("The server is waking up. This can take up to a minute.", {
      id: WAKE_UP_TOAST_ID,
    });
  }
}

function dismissWakeUpToastIfDone() {
  if (typeof window !== "undefined" && activeWakingRequests <= 0) {
    activeWakingRequests = 0;
    toast.dismiss(WAKE_UP_TOAST_ID);
  }
}

// ─── Response Interceptor ───────────────────────────────────────────────────

apiClient.interceptors.response.use(
  // Pass-through on success
  (response) => {
    if (response.config?.__retryCount && response.config.__retryCount > 0) {
      activeWakingRequests = Math.max(0, activeWakingRequests - 1);
      dismissWakeUpToastIfDone();
    }
    return response;
  },

  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

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

    // Waking-up UX: 502, 503, 504 or a network error (no response)
    const isNetworkError = !error.response;
    const isWakeUpStatus = status === 502 || status === 503 || status === 504;
    const isWakeUpError = isNetworkError || isWakeUpStatus;

    if (isWakeUpError) {
      const config = error.config;
      const method = config?.method?.toLowerCase();
      const isGet = method === "get";

      if (!isGet) {
        // Never auto-retry non-GET requests (show the friendly message only)
        if (typeof window !== "undefined") {
          toast("The server is waking up. This can take up to a minute.", {
            id: WAKE_UP_TOAST_ID,
          });
        }
        return Promise.reject(error);
      }

      if (config) {
        config.__retryCount = config.__retryCount || 0;

        if (config.__retryCount < MAX_WAKE_UP_RETRIES) {
          config.__retryCount += 1;
          if (config.__retryCount === 1) {
            activeWakingRequests++;
            showWakeUpToast();
          }

          await new Promise((resolve) => setTimeout(resolve, WAKE_UP_RETRY_DELAY_MS));

          return apiClient(config);
        } else {
          // Final failure after 3 retries
          activeWakingRequests = Math.max(0, activeWakingRequests - 1);
          dismissWakeUpToastIfDone();
          return Promise.reject(error);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
