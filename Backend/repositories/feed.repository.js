import { connectionRepo } from "./connection.repository.js";
import { postRepo } from "./post.repository.js";
import { likeRepo } from "./like.repository.js";
import { commentRepo } from "./comment.repository.js";

/**
 * Feed Repository — raw data access only.
 *
 * C3: Business logic (short-circuit, hasMore, nextCursor, enrichment mapping)
 * has been moved to FeedService. This class is a thin orchestration hub
 * that delegates each step to the appropriate feature repository and returns
 * raw, unenriched data.
 *
 * Total DB operations: 4 (constant regardless of feed size).
 */
export class FeedRepository {

    /**
     * Step 1: Resolve the set of user IDs connected to the requesting user.
     * @returns {ObjectId[]} Raw array of connected user ObjectIds.
     */
    async getAcceptedConnectionIds(userId) {
        return await connectionRepo.getAcceptedConnectionIds(userId);
    }

    /**
     * Step 2: Fetch raw paginated posts from a set of authors.
     * Fetches limit + 1 so the service can determine hasMore without a count query.
     * @returns {Object[]} Raw lean post documents (populated author fields).
     */
    async getFeedPosts(userIds, cursor, limit) {
        return await postRepo.getFeedPosts(userIds, cursor, limit);
    }

    /**
     * Step 3a: Batch-fetch like counts and likedByMe flags for a list of posts.
     * @returns {Array<{ _id: ObjectId, count: number, likedByMe: number }>}
     */
    async getLikeAndMeDataBatch(postIds, userId) {
        return await likeRepo.getLikeAndMeDataBatch(postIds, userId);
    }

    /**
     * Step 3b: Batch-fetch comment counts for a list of posts.
     * @returns {Array<{ _id: ObjectId, count: number }>}
     */
    async getCommentCountsBatch(postIds) {
        return await commentRepo.getCommentCountsBatch(postIds);
    }
}

// m6: Singleton export
export const feedRepo = new FeedRepository();
