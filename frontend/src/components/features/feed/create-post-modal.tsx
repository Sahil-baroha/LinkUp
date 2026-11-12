"use client";

/**
 * create-post-modal.tsx — Create/Edit post dialog
 *
 * Requirements:
 *   - Author avatar and name
 *   - Textarea with a counter (3000)
 *   - Image attach (image types, client check <=5MB with inline message)
 *   - Preview with remove
 *   - Post button disabled when empty or over limit
 *   - Submitting state
 *   - Server errors via mapServerErrors or toast
 *   - Success toast + feed invalidation
 *   - Edit mode unchanged
 */

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { useCreatePost, useUpdatePost } from "@/hooks/use-posts";
import { UserAvatar, Spinner } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn, mapServerErrors } from "@/lib/utils";

const MAX_BODY_LENGTH = 3000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const schema = z.object({
  body: z.string().min(1, "Post body is required").max(MAX_BODY_LENGTH),
});

type FormValues = z.infer<typeof schema>;

export function CreatePostModal() {
  const user = useAuthStore((s) => s.user);
  const open = useUiStore((s) => s.createPostModalOpen);
  const setOpen = useUiStore((s) => s.setCreatePostModalOpen);
  const editingPost = useUiStore((s) => s.editingPost);
  const setEditingPost = useUiStore((s) => s.setEditingPost);

  const isEditMode = !!editingPost;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreatePost(user?._id);
  const updateMutation = useUpdatePost(editingPost?._id ?? "");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: "" },
  });

  const bodyValue = watch("body") ?? "";

  // Pre-fill form when entering edit mode
  useEffect(() => {
    if (editingPost) {
      reset({ body: editingPost.body });
    } else {
      reset({ body: "" });
    }
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
  }, [editingPost, reset]);

  function handleClose() {
    setOpen(false);
    setEditingPost(null);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    reset();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setImageError("Image size must be 5MB or less");
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImageError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: FormValues) {
    const formData = new FormData();
    formData.append("body", values.body);
    if (imageFile) formData.append("image", imageFile);

    if (isEditMode) {
      updateMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Post updated");
          handleClose();
        },
        onError: (err: unknown) => {
          handleServerError(err, "Failed to update post");
        },
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Post published");
          handleClose();
        },
        onError: (err: unknown) => {
          handleServerError(err, "Failed to publish post");
        },
      });
    }
  }

  function handleServerError(err: unknown, fallbackMessage: string) {
    const res = (err as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } })?.response?.data;
    if (res?.errors && Array.isArray(res.errors)) {
      const unmatched = mapServerErrors(res.errors, setError);
      if (unmatched.length > 0) {
        toast.error(unmatched.join(", "));
      }
    } else {
      toast.error(res?.message || fallbackMessage);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isOverLimit = bodyValue.length > MAX_BODY_LENGTH;
  const isEmpty = !bodyValue.trim();
  const authorName = user?.name || user?.username || "You";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg backdrop-blur-md bg-white/95 border border-slate-200/50 rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-base font-semibold text-slate-900">
            {isEditMode ? "Edit post" : "Create a post"}
          </DialogTitle>
        </DialogHeader>

        {/* Author row */}
        {user && (
          <div className="flex items-center gap-3 px-6 pb-2">
            <UserAvatar
              src={user.profilePicture}
              name={authorName}
              size="md"
              seed={user._id}
            />
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {authorName}
              </span>
              {user.headline && (
                <span className="block truncate text-xs text-slate-400">
                  {user.headline}
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0">
          {/* Body textarea */}
          <div className="px-6 py-2">
            <Textarea
              {...register("body")}
              placeholder="What do you want to talk about?"
              className={cn(
                "min-h-[140px] resize-none border-0 p-0 text-sm shadow-none",
                "focus-visible:ring-0 placeholder:text-slate-400"
              )}
              maxLength={MAX_BODY_LENGTH}
            />
            {errors.body && (
              <p className="mt-1 text-xs text-red-500">{errors.body.message}</p>
            )}
            {/* Character counter */}
            <p
              className={cn(
                "mt-2 text-right text-xs",
                isOverLimit ? "text-red-500 font-medium" : "text-slate-400"
              )}
            >
              {bodyValue.length} / {MAX_BODY_LENGTH}
            </p>
          </div>

          {/* Image upload (create mode only) */}
          {!isEditMode && (
            <div className="px-6">
              {imagePreview ? (
                <div className="relative mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-lg object-cover max-h-48 border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    aria-label="Remove image"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ImagePlus size={16} strokeWidth={1.5} />
                  Add a photo
                </button>
              )}
              {imageError && (
                <p className="mb-3 text-xs text-red-500">{imageError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || isEmpty || isOverLimit || !!imageError}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <Spinner size="sm" />}
              {isEditMode ? "Save changes" : "Post"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
