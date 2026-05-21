"use client";

/**
 * create-post-modal.tsx — Create/Edit post dialog
 *
 * Controlled by: createPostModalOpen + editingPost from ui-store.
 * If editingPost is non-null → edit mode (pre-fills body, no image upload).
 * If editingPost is null → create mode.
 *
 * GlassCard treatment on DialogContent.
 * Image field name: "image" (confirmed from upload.middleware.js line 32).
 * Form: React Hook Form + Zod.
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
import { Spinner } from "@/components/shared/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const schema = z.object({
  body: z.string().min(1, "Post body is required").max(3000),
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreatePost(user?._id);
  const updateMutation = useUpdatePost(editingPost?._id ?? "");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: "" },
  });

  const bodyValue = watch("body");

  // Pre-fill form when entering edit mode
  useEffect(() => {
    if (editingPost) {
      reset({ body: editingPost.body });
    } else {
      reset({ body: "" });
    }
  }, [editingPost, reset]);

  function handleClose() {
    setOpen(false);
    setEditingPost(null);
    setImageFile(null);
    setImagePreview(null);
    reset();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: FormValues) {
    const formData = new FormData();
    formData.append("body", values.body);
    // Field name "image" — confirmed from upload.middleware.js
    if (imageFile) formData.append("image", imageFile);

    if (isEditMode) {
      updateMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Post updated");
          handleClose();
        },
        onError: () => toast.error("Failed to update post"),
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Post published");
          handleClose();
        },
        onError: () => toast.error("Failed to publish post"),
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg backdrop-blur-md bg-white/95 border border-slate-200/50 rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-semibold text-slate-900">
            {isEditMode ? "Edit post" : "Create a post"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0">
          {/* Body textarea */}
          <div className="px-6 py-4">
            <Textarea
              {...register("body")}
              placeholder="What do you want to talk about?"
              className={cn(
                "min-h-[120px] resize-none border-0 p-0 text-sm shadow-none",
                "focus-visible:ring-0 placeholder:text-slate-400"
              )}
              maxLength={3000}
            />
            {errors.body && (
              <p className="mt-1 text-xs text-red-500">{errors.body.message}</p>
            )}
            {/* Character counter */}
            <p
              className={cn(
                "mt-2 text-right text-xs",
                bodyValue.length > 2800 ? "text-red-500" : "text-slate-400"
              )}
            >
              {bodyValue.length} / 3000
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
                    className="w-full rounded-lg object-cover max-h-48"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-4 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors"
                >
                  <ImagePlus size={16} strokeWidth={1.5} />
                  Add a photo
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
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
              disabled={isPending || !bodyValue.trim()}
              className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
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
