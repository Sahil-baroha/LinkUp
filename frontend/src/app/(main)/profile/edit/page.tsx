"use client";

/**
 * /profile/edit/page.tsx — Comprehensive Profile Edit Page
 *
 * Requirements:
 * - RHF + Zod client schema mirroring backend caps and cross-field rules
 * - Photo: preview, image type + <=5MB client check, inline error, immediate upload via useUpdateAvatar with spinner, NO URL field
 * - Basic: name, username, headline, location
 * - About: textarea with counter
 * - Skills: chip input (Enter/comma adds, trim, case-insensitive dedupe, max 20, removable)
 * - Experience: useFieldArray (max 10, "current" disables endDate & sets null, month inputs)
 * - Education: useFieldArray (max 5, startYear, endYear)
 * - Month fields use <input type="month"> mapped to "YYYY-MM"
 * - Save disabled until form is dirty; Cancel returns to profile
 * - Submit sends only changed top-level fields (arrays whole)
 * - 409 username conflict -> field error
 * - Other server errors -> mapServerErrors
 * - Success -> toast, update query caches + auth store, navigate to profile
 * - No uppercase classes
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  Camera,
  Briefcase,
  GraduationCap,
  Award,
  Plus,
  Trash2,
  X,
  ArrowLeft,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useUpdateUser, useUpdateAvatar } from "@/hooks/use-user";
import { UserAvatar, Card, Spinner } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mapServerErrors } from "@/lib/utils";
import type { UpdateUserPayload } from "@/types";

// ─── Constants matching Backend Contract ──────────────────────────────────────

export const NAME_MAX = 60;
export const HEADLINE_MAX = 120;
export const ABOUT_MAX = 2000;
export const LOCATION_MAX = 80;
export const SKILLS_MAX_ITEMS = 20;
export const SKILL_CHAR_MAX = 40;
export const EXPERIENCE_MAX_ITEMS = 10;
export const EXP_TITLE_MAX = 100;
export const EXP_COMPANY_MAX = 100;
export const EXP_DESC_MAX = 500;
export const EDUCATION_MAX_ITEMS = 5;
export const EDU_SCHOOL_MAX = 100;
export const EDU_DEGREE_MAX = 100;
export const EDU_FIELD_MAX = 100;
export const EDU_START_YEAR_MIN = 1950;

const currentYear = new Date().getFullYear();

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const experienceItemSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(EXP_TITLE_MAX, `Title cannot exceed ${EXP_TITLE_MAX} characters`),
    company: z
      .string()
      .trim()
      .min(1, "Company is required")
      .max(EXP_COMPANY_MAX, `Company cannot exceed ${EXP_COMPANY_MAX} characters`),
    startDate: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Start date must be in YYYY-MM format"),
    endDate: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "End date must be in YYYY-MM format")
      .nullable()
      .optional()
      .or(z.literal("")),
    current: z.boolean(),
    description: z
      .string()
      .trim()
      .max(EXP_DESC_MAX, `Description cannot exceed ${EXP_DESC_MAX} characters`)
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.current && data.endDate && data.endDate !== "") {
        return false;
      }
      return true;
    },
    {
      message: "End date must be empty when currently working here",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      if (
        !data.current &&
        data.startDate &&
        data.endDate &&
        data.endDate !== "" &&
        data.endDate < data.startDate
      ) {
        return false;
      }
      return true;
    },
    {
      message: "End date cannot be before start date",
      path: ["endDate"],
    }
  );

const educationItemSchema = z
  .object({
    school: z
      .string()
      .trim()
      .min(1, "School is required")
      .max(EDU_SCHOOL_MAX, `School cannot exceed ${EDU_SCHOOL_MAX} characters`),
    degree: z
      .string()
      .trim()
      .max(EDU_DEGREE_MAX, `Degree cannot exceed ${EDU_DEGREE_MAX} characters`)
      .optional()
      .or(z.literal("")),
    field: z
      .string()
      .trim()
      .max(EDU_FIELD_MAX, `Field cannot exceed ${EDU_FIELD_MAX} characters`)
      .optional()
      .or(z.literal("")),
    startYear: z
      .number({ message: "Start year must be an integer" })
      .int("Start year must be an integer")
      .min(EDU_START_YEAR_MIN, `Start year must be at least ${EDU_START_YEAR_MIN}`)
      .max(currentYear + 8, `Start year cannot exceed ${currentYear + 8}`),
    endYear: z
      .number({ message: "End year must be an integer" })
      .int("End year must be an integer")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (
        data.startYear !== undefined &&
        data.endYear !== null &&
        data.endYear !== undefined &&
        data.endYear < data.startYear
      ) {
        return false;
      }
      return true;
    },
    {
      message: "End year cannot be before start year",
      path: ["endYear"],
    }
  );

const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(NAME_MAX, `Name cannot exceed ${NAME_MAX} characters`),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  headline: z
    .string()
    .trim()
    .max(HEADLINE_MAX, `Headline cannot exceed ${HEADLINE_MAX} characters`)
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .trim()
    .max(LOCATION_MAX, `Location cannot exceed ${LOCATION_MAX} characters`)
    .optional()
    .or(z.literal("")),
  about: z
    .string()
    .trim()
    .max(ABOUT_MAX, `About cannot exceed ${ABOUT_MAX} characters`)
    .optional()
    .or(z.literal("")),
  skills: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Skill cannot be empty")
        .max(SKILL_CHAR_MAX, `Skill cannot exceed ${SKILL_CHAR_MAX} characters`)
    )
    .max(SKILLS_MAX_ITEMS, `Skills cannot exceed ${SKILLS_MAX_ITEMS} items`),
  experience: z
    .array(experienceItemSchema)
    .max(EXPERIENCE_MAX_ITEMS, `Experience cannot exceed ${EXPERIENCE_MAX_ITEMS} entries`),
  education: z
    .array(educationItemSchema)
    .max(EDUCATION_MAX_ITEMS, `Education cannot exceed ${EDUCATION_MAX_ITEMS} entries`),
});

type FormValues = z.infer<typeof editProfileSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setUser = useAuthStore((s) => s.setUser);

  // Auth guard
  useEffect(() => {
    if (hasHydrated && !user) {
      router.replace("/login");
    }
  }, [hasHydrated, user, router]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");

  const updateMutation = useUpdateUser(user?._id ?? "");
  const avatarMutation = useUpdateAvatar(user?._id ?? "");

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: "",
      username: "",
      headline: "",
      location: "",
      about: "",
      skills: [],
      experience: [],
      education: [],
    },
  });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({
    control,
    name: "experience",
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({
    control,
    name: "education",
  });

  // Populate form on user load
  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? "",
        username: user.username ?? "",
        headline: user.headline ?? "",
        location: user.location ?? "",
        about: user.about ?? "",
        skills: user.skills ? [...user.skills] : [],
        experience: user.experience
          ? user.experience.map((e) => ({
              title: e.title ?? "",
              company: e.company ?? "",
              startDate: e.startDate ?? "",
              endDate: e.endDate ?? "",
              current: Boolean(e.current),
              description: e.description ?? "",
            }))
          : [],
        education: user.education
          ? user.education.map((e) => ({
              school: e.school ?? "",
              degree: e.degree ?? "",
              field: e.field ?? "",
              startYear: e.startYear,
              endYear: e.endYear ?? null,
            }))
          : [],
      });
    }
  }, [user, reset]);

  // Watch fields for character counter and dynamic UI
  const watchedAbout = useWatch({ control, name: "about" }) || "";
  const watchedSkills = useWatch({ control, name: "skills" }) || [];
  const watchedExperiences = useWatch({ control, name: "experience" }) || [];

  if (!hasHydrated || !user) {
    return null;
  }

  // ─── Photo Upload Handler ───────────────────────────────────────────────────

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    // Validate size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size must be 5MB or less.");
      return;
    }

    avatarMutation.mutate(file, {
      onSuccess: () => {
        toast.success("Profile photo updated");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err) => {
        if (isAxiosError(err)) {
          setPhotoError(err.response?.data?.message || "Failed to upload avatar.");
        } else {
          setPhotoError("An unexpected error occurred while uploading.");
        }
      },
    });
  }

  // ─── Skills Input Handlers ──────────────────────────────────────────────────

  function handleAddSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;

    if (trimmed.length > SKILL_CHAR_MAX) {
      toast.error(`Skill cannot exceed ${SKILL_CHAR_MAX} characters`);
      return;
    }

    if (watchedSkills.length >= SKILLS_MAX_ITEMS) {
      toast.error(`Maximum of ${SKILLS_MAX_ITEMS} skills allowed`);
      return;
    }

    // Case-insensitive dedupe
    const exists = watchedSkills.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.error("Skill already added");
      setSkillInput("");
      return;
    }

    setValue("skills", [...watchedSkills, trimmed], { shouldDirty: true });
    setSkillInput("");
  }

  function handleRemoveSkill(indexToRemove: number) {
    setValue(
      "skills",
      watchedSkills.filter((_, idx) => idx !== indexToRemove),
      { shouldDirty: true }
    );
  }

  // ─── Form Submission ────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    if (!user) return;
    const payload: UpdateUserPayload = {};

    // Submit only top-level fields that have changed (arrays whole)
    if (values.name !== (user?.name ?? "")) payload.name = values.name;
    if (values.username !== (user?.username ?? "")) payload.username = values.username;
    if (values.headline !== (user?.headline ?? "")) payload.headline = values.headline || "";
    if (values.location !== (user?.location ?? "")) payload.location = values.location || "";
    if (values.about !== (user?.about ?? "")) payload.about = values.about || "";

    // Skills
    payload.skills = values.skills;

    // Experience
    payload.experience = values.experience.map((exp) => ({
      title: exp.title.trim(),
      company: exp.company.trim(),
      startDate: exp.startDate,
      endDate: exp.current ? null : exp.endDate || null,
      current: Boolean(exp.current),
      description: exp.description?.trim() || undefined,
    }));

    // Education
    payload.education = values.education.map((edu) => ({
      school: edu.school.trim(),
      degree: edu.degree?.trim() || undefined,
      field: edu.field?.trim() || undefined,
      startYear: Number(edu.startYear),
      endYear: edu.endYear && !isNaN(Number(edu.endYear)) ? Number(edu.endYear) : null,
    }));

    updateMutation.mutate(payload, {
      onSuccess: (updatedUser) => {
        setUser(updatedUser);
        queryClient.setQueryData(["users", user._id], updatedUser);
        queryClient.invalidateQueries({ queryKey: ["users", user._id] });
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        toast.success("Profile updated");
        router.push(`/profile/${user._id}`);
      },
      onError: (err) => {
        if (isAxiosError(err)) {
          if (err.response?.status === 409) {
            setError("username", {
              type: "server",
              message: "Username is already taken",
            });
            return;
          }

          const serverErrors = err.response?.data?.errors;
          const unmatched = mapServerErrors(
            serverErrors,
            setError,
            [
              "name",
              "username",
              "headline",
              "location",
              "about",
              "skills",
              "experience",
              "education",
            ]
          );

          if (unmatched.length > 0) {
            toast.error(unmatched.join(". "));
          } else if (!serverErrors) {
            toast.error(err.response?.data?.message || "Failed to update profile");
          }
        } else {
          toast.error("Failed to update profile");
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${user._id}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Edit Profile</h1>
            <p className="text-xs text-slate-500">
              Update your public presence and professional background
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${user._id}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty || isSubmitting || updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {(isSubmitting || updateMutation.isPending) && <Spinner size="sm" />}
            Save Changes
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Section 1: Profile Photo ──────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Profile Photo</h2>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="relative shrink-0">
              <UserAvatar
                src={user.profilePicture}
                name={user.name}
                size="xl"
                seed={user._id}
              />
              {avatarMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Spinner size="md" className="border-white" />
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Camera size={14} />
                  Change photo
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Recommended: Square image (JPEG, PNG, WebP), max 5MB. Uploaded immediately.
              </p>

              {photoError && (
                <p className="text-xs text-red-600 font-medium">{photoError}</p>
              )}
            </div>
          </div>
        </Card>

        {/* ── Section 2: Basic Info ─────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-500">
                Full Name *
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. Jane Doe"
                className="h-10 text-sm"
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-slate-500">
                Username *
              </Label>
              <Input
                id="username"
                {...register("username")}
                placeholder="e.g. janedoe"
                className="h-10 text-sm"
              />
              {errors.username && (
                <p className="text-xs text-red-500">{errors.username.message}</p>
              )}
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="headline" className="text-xs font-semibold text-slate-500">
                Headline
              </Label>
              <span className="text-[11px] text-slate-400">Max {HEADLINE_MAX} chars</span>
            </div>
            <Input
              id="headline"
              {...register("headline")}
              placeholder="e.g. Senior Software Engineer at Acme Corp"
              className="h-10 text-sm"
            />
            {errors.headline && (
              <p className="text-xs text-red-500">{errors.headline.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs font-semibold text-slate-500">
              Location
            </Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="e.g. San Francisco, CA"
              className="h-10 text-sm"
            />
            {errors.location && (
              <p className="text-xs text-red-500">{errors.location.message}</p>
            )}
          </div>
        </Card>

        {/* ── Section 3: About ──────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">About</h2>
            <span
              className={`text-xs ${
                watchedAbout.length > ABOUT_MAX ? "text-red-500 font-semibold" : "text-slate-400"
              }`}
            >
              {watchedAbout.length} / {ABOUT_MAX}
            </span>
          </div>

          <div className="space-y-1.5">
            <Textarea
              id="about"
              {...register("about")}
              placeholder="Write a brief overview about your career, goals, and expertise..."
              rows={5}
              className="text-sm resize-y"
            />
            {errors.about && (
              <p className="text-xs text-red-500">{errors.about.message}</p>
            )}
          </div>
        </Card>

        {/* ── Section 4: Skills ─────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Skills</h2>
            </div>
            <span className="text-xs text-slate-400">
              {watchedSkills.length} / {SKILLS_MAX_ITEMS}
            </span>
          </div>

          {/* Skill chip input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Type a skill and press Enter or comma..."
                disabled={watchedSkills.length >= SKILLS_MAX_ITEMS}
                className="h-9 text-sm"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                disabled={!skillInput.trim() || watchedSkills.length >= SKILLS_MAX_ITEMS}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shrink-0"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {/* Chips list */}
            {watchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {watchedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {errors.skills && (
              <p className="text-xs text-red-500">{errors.skills.message}</p>
            )}
          </div>
        </Card>

        {/* ── Section 5: Experience ─────────────────────────────── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Experience</h2>
            </div>
            <button
              type="button"
              onClick={() =>
                appendExperience({
                  title: "",
                  company: "",
                  startDate: "",
                  endDate: "",
                  current: false,
                  description: "",
                })
              }
              disabled={experienceFields.length >= EXPERIENCE_MAX_ITEMS}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Plus size={14} />
              Add Position ({experienceFields.length}/{EXPERIENCE_MAX_ITEMS})
            </button>
          </div>

          {experienceFields.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No experience added yet.</p>
          ) : (
            <div className="space-y-6 divide-y divide-slate-100">
              {experienceFields.map((field, index) => {
                const isCurrent = Boolean(watchedExperiences[index]?.current);

                return (
                  <div key={field.id} className={index === 0 ? "space-y-4" : "pt-6 space-y-4"}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Position #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Title */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500">
                          Title *
                        </Label>
                        <Input
                          {...register(`experience.${index}.title`)}
                          placeholder="e.g. Lead Designer"
                          className="h-9 text-sm"
                        />
                        {errors.experience?.[index]?.title && (
                          <p className="text-xs text-red-500">
                            {errors.experience[index]?.title?.message}
                          </p>
                        )}
                      </div>

                      {/* Company */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500">
                          Company *
                        </Label>
                        <Input
                          {...register(`experience.${index}.company`)}
                          placeholder="e.g. Acme Corp"
                          className="h-9 text-sm"
                        />
                        {errors.experience?.[index]?.company && (
                          <p className="text-xs text-red-500">
                            {errors.experience[index]?.company?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      {/* Start Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500">
                          Start Date (YYYY-MM) *
                        </Label>
                        <input
                          type="month"
                          {...register(`experience.${index}.startDate`)}
                          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        {errors.experience?.[index]?.startDate && (
                          <p className="text-xs text-red-500">
                            {errors.experience[index]?.startDate?.message}
                          </p>
                        )}
                      </div>

                      {/* End Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500">
                          End Date (YYYY-MM)
                        </Label>
                        <input
                          type="month"
                          disabled={isCurrent}
                          {...register(`experience.${index}.endDate`)}
                          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:bg-slate-50"
                        />
                        {errors.experience?.[index]?.endDate && (
                          <p className="text-xs text-red-500">
                            {errors.experience[index]?.endDate?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Current Checkbox */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`exp-current-${index}`}
                        {...register(`experience.${index}.current`, {
                          onChange: (e) => {
                            if (e.target.checked) {
                              setValue(`experience.${index}.endDate`, "", {
                                shouldDirty: true,
                              });
                            }
                          },
                        })}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor={`exp-current-${index}`}
                        className="text-xs text-slate-600 font-medium cursor-pointer"
                      >
                        I currently work here
                      </label>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">
                        Description
                      </Label>
                      <Textarea
                        {...register(`experience.${index}.description`)}
                        placeholder="Key responsibilities and achievements..."
                        rows={3}
                        className="text-sm"
                      />
                      {errors.experience?.[index]?.description && (
                        <p className="text-xs text-red-500">
                          {errors.experience[index]?.description?.message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Section 6: Education ──────────────────────────────── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Education</h2>
            </div>
            <button
              type="button"
              onClick={() =>
                appendEducation({
                  school: "",
                  degree: "",
                  field: "",
                  startYear: currentYear - 4,
                  endYear: currentYear,
                })
              }
              disabled={educationFields.length >= EDUCATION_MAX_ITEMS}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Plus size={14} />
              Add Education ({educationFields.length}/{EDUCATION_MAX_ITEMS})
            </button>
          </div>

          {educationFields.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No education added yet.</p>
          ) : (
            <div className="space-y-6 divide-y divide-slate-100">
              {educationFields.map((field, index) => (
                <div key={field.id} className={index === 0 ? "space-y-4" : "pt-6 space-y-4"}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      School #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>

                  {/* School */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500">
                      School / University *
                    </Label>
                    <Input
                      {...register(`education.${index}.school`)}
                      placeholder="e.g. Stanford University"
                      className="h-9 text-sm"
                    />
                    {errors.education?.[index]?.school && (
                      <p className="text-xs text-red-500">
                        {errors.education[index]?.school?.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Degree */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">
                        Degree
                      </Label>
                      <Input
                        {...register(`education.${index}.degree`)}
                        placeholder="e.g. Bachelor of Science"
                        className="h-9 text-sm"
                      />
                      {errors.education?.[index]?.degree && (
                        <p className="text-xs text-red-500">
                          {errors.education[index]?.degree?.message}
                        </p>
                      )}
                    </div>

                    {/* Field of Study */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">
                        Field of Study
                      </Label>
                      <Input
                        {...register(`education.${index}.field`)}
                        placeholder="e.g. Computer Science"
                        className="h-9 text-sm"
                      />
                      {errors.education?.[index]?.field && (
                        <p className="text-xs text-red-500">
                          {errors.education[index]?.field?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Start Year */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">
                        Start Year *
                      </Label>
                      <Input
                        type="number"
                        {...register(`education.${index}.startYear`, { valueAsNumber: true })}
                        placeholder="e.g. 2018"
                        className="h-9 text-sm"
                      />
                      {errors.education?.[index]?.startYear && (
                        <p className="text-xs text-red-500">
                          {errors.education[index]?.startYear?.message}
                        </p>
                      )}
                    </div>

                    {/* End Year */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500">
                        End Year (or expected)
                      </Label>
                      <Input
                        type="number"
                        {...register(`education.${index}.endYear`, {
                          setValueAs: (v) =>
                            v === "" || v === null || v === undefined ? null : Number(v),
                        })}
                        placeholder="e.g. 2022"
                        className="h-9 text-sm"
                      />
                      {errors.education?.[index]?.endYear && (
                        <p className="text-xs text-red-500">
                          {errors.education[index]?.endYear?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Footer actions ────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/profile/${user._id}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isDirty || isSubmitting || updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {(isSubmitting || updateMutation.isPending) && <Spinner size="sm" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
