"use client";

/**
 * profile/[userId]/page.tsx — Professional Profile
 *
 * Requirements:
 * - Skeleton while loading
 * - EmptyState for 404 or inactive account
 * - Own-profile detection via auth store
 * - Shared components (Card, EmptyState, Skeleton)
 * - Header card (ProfileHeader)
 * - Sections as cards: About, Experience, Education, Skills, Activity
 * - Hide empty sections for other users; show "Add" prompt on own profile
 * - Dates: static month-name array, never Date objects
 * - Plain text with whitespace-pre-line; never dangerouslySetInnerHTML
 * - Empty activity state: own profile shows "Share your first post" calling setCreatePostModalOpen(true)
 */

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileText, Briefcase, GraduationCap, Award, Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { useUser } from "@/hooks/use-user";
import { useUserPosts } from "@/hooks/use-posts";
import { ProfileHeader } from "@/components/features/profile/profile-header";
import { PostCard } from "@/components/features/feed/post-card";
import { Card, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateRange } from "@/lib/utils";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const authUser = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setCreatePostModalOpen = useUiStore((s) => s.setCreatePostModalOpen);

  // Auth guard
  useEffect(() => {
    if (hasHydrated && !authUser) router.replace("/login");
  }, [hasHydrated, authUser, router]);

  const isOwnProfile = authUser?._id === userId;

  // Profile data query
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
  } = useUser(userId);

  // User posts query
  const { data: posts, isLoading: postsLoading } = useUserPosts(userId);

  if (!hasHydrated) return null;

  // 404 or inactive account state
  if (userError || (user && user.active === false)) {
    return (
      <EmptyState
        icon={FileText}
        title="User not found"
        description="This profile doesn't exist or is currently inactive."
        action={{ label: "Go to Feed", onClick: () => router.push("/feed") }}
      />
    );
  }

  if (userLoading || !user) {
    return <ProfilePageSkeleton />;
  }

  const hasAbout = Boolean(user.about?.trim());
  const hasExperience = Boolean(user.experience && user.experience.length > 0);
  const hasEducation = Boolean(user.education && user.education.length > 0);
  const hasSkills = Boolean(user.skills && user.skills.length > 0);

  return (
    <div className="space-y-6">
      {/* ── 1. Profile Header Card ──────────────────────────────── */}
      <ProfileHeader user={user} isOwnProfile={isOwnProfile} />

      {/* ── 2. About Section ────────────────────────────────────── */}
      {(hasAbout || isOwnProfile) && (
        <Card className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">About</h2>
            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                {hasAbout ? "Edit" : <><Plus size={14} /> Add</>}
              </Link>
            )}
          </div>
          {hasAbout ? (
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {user.about}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Add a summary about your experience, interests, or background.
            </p>
          )}
        </Card>
      )}

      {/* ── 3. Experience Section ───────────────────────────────── */}
      {(hasExperience || isOwnProfile) && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Experience</h2>
            </div>
            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                {hasExperience ? "Edit" : <><Plus size={14} /> Add</>}
              </Link>
            )}
          </div>

          {hasExperience ? (
            <div className="divide-y divide-slate-100">
              {user.experience!.map((exp, index) => (
                <div key={index} className={index === 0 ? "pb-4" : "py-4"}>
                  <h3 className="text-sm font-semibold text-slate-900">{exp.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{exp.company}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </p>
                  {exp.description && (
                    <p className="text-xs text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Add your work history and past roles.
            </p>
          )}
        </Card>
      )}

      {/* ── 4. Education Section ────────────────────────────────── */}
      {(hasEducation || isOwnProfile) && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Education</h2>
            </div>
            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                {hasEducation ? "Edit" : <><Plus size={14} /> Add</>}
              </Link>
            )}
          </div>

          {hasEducation ? (
            <div className="divide-y divide-slate-100">
              {user.education!.map((edu, index) => (
                <div key={index} className={index === 0 ? "pb-4" : "py-4"}>
                  <h3 className="text-sm font-semibold text-slate-900">{edu.school}</h3>
                  {(edu.degree || edu.field) && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      {[edu.degree, edu.field].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {edu.startYear}{edu.endYear ? ` - ${edu.endYear}` : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Add schools, degrees, or courses you have completed.
            </p>
          )}
        </Card>
      )}

      {/* ── 5. Skills Section ──────────────────────────────────── */}
      {(hasSkills || isOwnProfile) && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Skills</h2>
            </div>
            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                {hasSkills ? "Edit" : <><Plus size={14} /> Add</>}
              </Link>
            )}
          </div>

          {hasSkills ? (
            <div className="flex flex-wrap gap-2">
              {user.skills!.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Highlight your key technical or domain skills.
            </p>
          )}
        </Card>
      )}

      {/* ── 6. Activity / Posts Section ────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900 px-0.5">
          Activity
        </h2>

        {postsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200/50 bg-white p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : !posts || posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No posts yet"
            description={
              isOwnProfile
                ? "Share your thoughts, projects, or insights with your network."
                : "This user hasn't posted anything yet."
            }
            action={
              isOwnProfile
                ? {
                    label: "Share your first post",
                    onClick: () => setCreatePostModalOpen(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Page Skeleton ───────────────────────────────────────────────────

function ProfilePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="rounded-xl border border-slate-200/50 bg-white overflow-hidden">
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="px-6 pb-6 pt-14 relative">
          <div className="absolute left-6 -top-12">
            <Skeleton className="h-24 w-24 rounded-full ring-4 ring-white" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-64 rounded mt-2" />
          </div>
        </div>
      </div>

      {/* Sections Skeleton */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6 space-y-3">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </Card>
      ))}
    </div>
  );
}
