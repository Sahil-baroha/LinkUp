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
import { getUserById, updateUser } from "@/lib/api";
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
