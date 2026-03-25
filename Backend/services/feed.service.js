import { feedRepo } from "../repositories/feed.repository.js";

export class FeedService {

    /**
     * GET /api/v1/feed
     *
     * C3: All feed orchestration now lives here (moved from FeedRepository).
     *
     * Algorithm (4 constant DB queries):
     *   Step 1: Resolve connected user IDs
     *   Step 2: Fetch limit+1 posts (for hasMore detection)
     *   Step 3: Batch like + comment data in parallel
     *   Step 4: Build O(1) Maps and merge enrichment onto posts
     *
     * @param {string} userId   - Current user's ID (string from JWT)
     * @param {Date}   cursor   - Only return posts older than this date
     * @param {number} limit    - Number of posts the caller wants
     * @returns {{ posts: Array, hasMore: boolean, nextCursor: string|null }}
     */
    async getFeed(userId, cursor, limit) {

        // ── Step 1: Who is this user connected to? ───────────────────────────
        const connectedUserIds = await feedRepo.getAcceptedConnectionIds(userId);

        // Short-circuit: no connections → empty feed (avoids Steps 2–4 entirely)
        if (connectedUserIds.length === 0) {
            return { posts: [], hasMore: false, nextCursor: null };
        }

        // M12: Cap the $in array at 1000 to prevent MongoDB BSON doc size issues
        // for hyper-connected users. Feed shows most-recently-connected peers first.
        const cappedIds = connectedUserIds.slice(0, 1000);

        // ── Step 2: Fetch limit + 1 posts from connected users ───────────────
        const rawPosts = await feedRepo.getFeedPosts(cappedIds, cursor, limit);

        // Determine hasMore from the extra document, then slice to limit
        const hasMore = rawPosts.length > limit;
        const posts   = rawPosts.slice(0, limit);

        if (posts.length === 0) {
            return { posts: [], hasMore: false, nextCursor: null };
        }

        // m4: Guard toISOString() — lean() should return Date objects,
        // but coerce defensively in case a seed script stored a string.
        const lastPost = posts[posts.length - 1];
        const nextCursor = hasMore
            ? (lastPost.createdAt instanceof Date
                ? lastPost.createdAt.toISOString()
                : new Date(lastPost.createdAt).toISOString())
            : null;

        // ── Step 3: Extract ObjectIds and batch-fetch enrichment data ─────────
        const postIds = posts.map((p) => p._id);

        const [likeData, commentData] = await Promise.all([
            feedRepo.getLikeAndMeDataBatch(postIds, userId),
            feedRepo.getCommentCountsBatch(postIds),
        ]);

        // ── Step 4: Build O(1) lookup Maps ────────────────────────────────────
        const likeDataMap = new Map(
            likeData.map((l) => [l._id.toString(), { count: l.count, likedByMe: l.likedByMe }])
        );
        const commentCountMap = new Map(
            commentData.map((c) => [c._id.toString(), c.count])
        );

        // ── Step 5: Merge enrichment onto each post ───────────────────────────
        const enrichedPosts = posts.map((post) => {
            const pid       = post._id.toString();
            const likeEntry = likeDataMap.get(pid);
            return {
                ...post,
                likeCount:    likeEntry?.count    ?? 0,
                isLikedByMe:  (likeEntry?.likedByMe ?? 0) > 0,
                commentCount: commentCountMap.get(pid) ?? 0,
            };
        });

        return { posts: enrichedPosts, hasMore, nextCursor };
    }
}
