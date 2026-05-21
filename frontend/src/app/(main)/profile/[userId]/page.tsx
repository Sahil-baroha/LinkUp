"use client";

/**
 * profile/[userId]/page.tsx — Professional Profile
 *
 * Stitch layout: ProfileHeader (cover + avatar + info) → posts grid below
 *
 * Wiring:
 *   - useUser(userId) for profile data
 *   - getUserPosts(userId) for posts (plain Post[], NOT FeedPost)
 *   - isOwnProfile = authStore.user?._id === userId
 *   - Loading: header skeleton + post skeleton list
 *   - Error/404: EmptyState with "User not found"
 *   - Posts empty: EmptyState with FileText icon
 */

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { getUserPosts } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { ProfileHeader } from "@/components/features/profile/profile-header";
import { PostCard } from "@/components/features/feed/post-card";
import { EmptyState, Spinner } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const authUser = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Auth guard
  useEffect(() => {
    if (hasHydrated && !authUser) router.replace("/login");
  }, [hasHydrated, authUser, router]);

  const isOwnProfile = authUser?._id === userId;

  // User profile query
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
  } = useUser(userId);

  // User posts query — plain Post[] (no isLikedByMe / likeCount / commentCount)
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["posts", "user", userId],
    queryFn: () => getUserPosts(userId),
    enabled: !!userId && !!user,
  });

  if (!hasHydrated) return null;

  // 404 state
  if (userError) {
    return (
      <EmptyState
        icon={FileText}
        title="User not found"
        description="This profile doesn't exist or has been removed."
        action={{ label: "Go to Feed", onClick: () => router.push("/feed") }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Profile Header ─────────────────────────────────────── */}
      {userLoading ? (
        <ProfileHeaderSkeleton />
      ) : user ? (
        <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
      ) : null}

      {/* ── Posts Section ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 px-0.5">
          Activity
        </h2>

        {postsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
        ) : !posts?.length ? (
          <EmptyState
            icon={FileText}
            title="No posts yet"
            description={
              isOwnProfile
                ? "Share your thoughts — create your first post."
                : "This user hasn't posted anything yet."
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              // Plain Post — pass as-is. LikeButton defaults to initialLiked=false, initialCount=0
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile header skeleton ──────────────────────────────────────────────────

function ProfileHeaderSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200/50 bg-white overflow-hidden">
      {/* Cover */}
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="px-6 pb-6">
        {/* Avatar */}
        <div className="-mt-8 mb-4">
          <Skeleton className="h-16 w-16 rounded-full ring-4 ring-white" />
        </div>
        {/* Name + meta */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      </div>
    </div>
  );
}
