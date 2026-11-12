"use client";

/**
 * likes-dialog.tsx — Dialog showing users who liked a post
 *
 * Requirements:
 *   - shadcn Dialog
 *   - Rows with UserAvatar, name (link to /profile/:id), headline
 *   - Loading skeletons, empty state, "Load more" button
 *   - Uses usePostLikes hook
 */

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared";
import { usePostLikes } from "@/hooks/use-posts";

interface LikesDialogProps {
  postId: string;
  likeCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LikesDialog({
  postId,
  likeCount,
  open,
  onOpenChange,
}: LikesDialogProps) {
  const {
    users,
    likeCount: totalCount,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
  } = usePostLikes(postId, open);

  const displayCount = totalCount || likeCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">
            Likes {displayCount > 0 ? `(${displayCount})` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No likes yet
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {users.map((likeUser) => {
                  const authorName = likeUser.name || likeUser.username;
                  return (
                    <div
                      key={likeUser._id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <Link
                        href={`/profile/${likeUser._id}`}
                        onClick={() => onOpenChange(false)}
                        className="shrink-0"
                      >
                        <UserAvatar
                          src={likeUser.profilePicture}
                          name={authorName}
                          size="md"
                          seed={likeUser._id}
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/profile/${likeUser._id}`}
                          onClick={() => onOpenChange(false)}
                          className="block truncate font-semibold text-sm text-slate-900 hover:underline hover:underline-offset-2 transition-colors"
                        >
                          {authorName}
                        </Link>
                        {likeUser.headline && (
                          <p className="truncate text-xs text-slate-500">
                            {likeUser.headline}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="pt-3 pb-1 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={isFetchingMore}
                    className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    {isFetchingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
