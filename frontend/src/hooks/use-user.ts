/**
 * use-user.ts — User profile query and update mutation
 *
 * Owns the ['users', userId] cache namespace. Separate from auth.
 *
 * On updateUser success: invalidates BOTH ['users', userId] AND ['auth', 'me'].
 * Reason: if the updated user IS the current user, the auth cache (used by the
 * authenticated layout's revalidation query) also needs refreshing so the
 * displayed name/avatar updates without requiring logout.
 *
 * Toast notifications belong in the component's onSuccess, not here.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserById, updateUser, updateAvatar, getSuggestions } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { UpdateUserPayload } from "@/types";

// ─── Single user query ────────────────────────────────────────────────────────

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: () => getUserById(userId!),
    enabled: !!userId,
  });
}

// ─── Update user mutation ─────────────────────────────────────────────────────

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserPayload) => updateUser(userId, data),
    onSuccess: () => {
      // Invalidate the profile cache for this user
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      // Invalidate the auth cache — required if this is the current user
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    // onError / toast: handled in the calling component
  });
}

// ─── Update avatar mutation ───────────────────────────────────────────────────

export function useUpdateAvatar(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => updateAvatar(userId, file),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["user", userId], updatedUser);
      queryClient.setQueryData(["users", userId], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["users", userId] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      useAuthStore.getState().setUser(updatedUser);
    },
  });
}

// ─── Suggestions query ────────────────────────────────────────────────────────

/**
 * useSuggestions — fetches connection suggestions for the current user.
 * Cache key: ['users', 'suggestions', limit]
 * Stale time: 2 minutes (matches backend 120 s cache TTL).
 */
export function useSuggestions(limit: number) {
  return useQuery({
    queryKey: ["users", "suggestions", limit],
    queryFn: () => getSuggestions(limit),
    staleTime: 2 * 60 * 1000, // 2 min — matches backend cache TTL
  });
}
