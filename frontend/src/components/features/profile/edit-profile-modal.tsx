"use client";

/**
 * edit-profile-modal.tsx — Edit username + profile picture URL
 *
 * GlassCard treatment on DialogContent.
 * Form: React Hook Form + Zod.
 * Live avatar preview via watch('profilePicture').
 * 409 conflict → setError on username field.
 *
 * On success: calls setUser(updatedUser) on Zustand store,
 * invalidates ['users', user._id] and ['auth', 'me'], fires toast.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useUpdateUser } from "@/hooks/use-user";
import { Avatar } from "@/components/shared/avatar";
import { Spinner } from "@/components/shared/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/types";

const schema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  profilePicture: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function EditProfileModal({ open, onOpenChange, user }: EditProfileModalProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const updateMutation = useUpdateUser(user._id);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: user.username,
      profilePicture: user.profilePicture ?? "",
    },
  });

  // Sync form when user prop changes
  useEffect(() => {
    reset({
      username: user.username,
      profilePicture: user.profilePicture ?? "",
    });
  }, [user, reset]);

  const watchedPicture = watch("profilePicture");

  async function onSubmit(values: FormValues) {
    updateMutation.mutate(
      {
        username: values.username,
        profilePicture: values.profilePicture || undefined,
      },
      {
        onSuccess: (updatedUser) => {
          // Keep Zustand in sync with the saved profile
          setUser(updatedUser);
          queryClient.invalidateQueries({ queryKey: ["users", user._id] });
          queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
          toast.success("Profile updated");
          onOpenChange(false);
        },
        onError: (err) => {
          // Handle username conflict (409)
          if (isAxiosError(err) && err.response?.status === 409) {
            setError("username", { message: "Username already taken" });
          } else {
            toast.error("Failed to update profile");
          }
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-md bg-white/95 border border-slate-200/50 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Live avatar preview */}
          <div className="flex justify-center">
            <Avatar
              src={watchedPicture || null}
              name={user.name}
              size="xl"
              seed={user._id}
            />
          </div>

          {/* Profile picture URL */}
          <div className="space-y-1.5">
            <Label htmlFor="profilePicture" className="text-sm font-medium text-slate-700">
              Profile Picture URL
            </Label>
            <Input
              id="profilePicture"
              type="url"
              placeholder="https://..."
              {...register("profilePicture")}
              className={errors.profilePicture ? "border-red-300 focus-visible:ring-red-300" : ""}
            />
            {errors.profilePicture && (
              <p className="text-xs text-red-500">{errors.profilePicture.message}</p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-medium text-slate-700">
              Username
            </Label>
            <Input
              id="username"
              {...register("username")}
              className={errors.username ? "border-red-300 focus-visible:ring-red-300" : ""}
            />
            {errors.username && (
              <p className="text-xs text-red-500">{errors.username.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
          >
            {updateMutation.isPending && <Spinner size="sm" />}
            Save Changes
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
