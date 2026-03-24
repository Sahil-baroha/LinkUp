import { ConnectionRepository } from "./connection.repository.js";
import { PostRepository } from "./post.repository.js";
import { LikeRepository } from "./like.repository.js";
import { CommentRepository } from "./comment.repository.js";

const connectionRepo = new ConnectionRepository();
const postRepo       = new PostRepository();
const likeRepo       = new LikeRepository();
const commentRepo    = new CommentRepository();

/**
 * Feed Repository — orchestration layer only.
 *
 * Responsibilities:
 *   Step 1: Resolve connected user IDs
 *   Step 2: Fetch paginated posts from those users
 *   Step 3: Batch-fetch like data + comment counts in 2 parallel queries
 *   Step 4: Build lookup Maps and merge enrichment onto posts
 *
 * Never queries the DB directly — delegates to the four feature repositories.
 * Total DB operations: 4 (constant regardless of feed size).
 */
export class FeedRepository {

    /**
     * Orchestrate all feed DB operations.
     *
     * @param {string}  userId  - Current user's ID (string from JWT)
     * @param {Date}    cursor  - Cursor date; only posts older than this are returned
     * @param {number}  limit   - Number of posts the caller wants (we fetch limit + 1)
     * @returns {{ posts: Array, hasMore: boolean, nextCursor: string|null }}
     */
    async getFeed(userId, cursor, limit) {

        // ── Step 1: Who is this user connected to? ───────────────────────────
        const connectedUserIds = await connectionRepo.getAcceptedConnectionIds(userId);

        // Short-circuit: no connections → empty feed (avoids Steps 2–4 entirely)
        if (connectedUserIds.length === 0) {
            return { posts: [], hasMore: false, nextCursor: null };
        }

        // ── Step 2: Fetch limit + 1 posts from connected users ───────────────
        const rawPosts = await postRepo.getFeedPosts(connectedUserIds, cursor, limit);

        // Determine hasMore from the extra document, then slice to limit
        const hasMore   = rawPosts.length > limit;
        const posts     = rawPosts.slice(0, limit);
        const nextCursor = hasMore
            ? posts[posts.length - 1].createdAt.toISOString()
            : null;

        // Nothing to enrich if no posts returned
        if (posts.length === 0) {
            return { posts: [], hasMore: false, nextCursor: null };
        }

        // ── Step 3: Extract ObjectIds for batch queries ───────────────────────
        const postIds = posts.map((p) => p._id);

        // ── Step 4: Batch-fetch like + comment data in parallel ───────────────
        const [likeData, commentData] = await Promise.all([
            likeRepo.getLikeAndMeDataBatch(postIds, userId),
            commentRepo.getCommentCountsBatch(postIds),
        ]);

        // ── Step 5: Build O(1) lookup Maps ────────────────────────────────────
        const likeDataMap = new Map(
            likeData.map((l) => [l._id.toString(), { count: l.count, likedByMe: l.likedByMe }])
        );
        const commentCountMap = new Map(
            commentData.map((c) => [c._id.toString(), c.count])
        );

        // ── Step 6: Merge enrichment onto each post ───────────────────────────
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
