import { likeRepo } from "../repositories/like.repository.js";
import { postRepo } from "../repositories/post.repository.js";
import { NotFoundError } from "../utils/errors.js";

// MongoDB duplicate key error code
const MONGO_DUPLICATE_KEY = 11000;

export class LikeService {

    // ─── TOGGLE ──────────────────────────────────────────────────────────────

    /**
     * POST /posts/:postId/like
     *
     * Toggle like/unlike for the current user on a post.
     *
     * Rules enforced:
     * - Post must exist before any like operation
     * - If like exists  → delete it (unlike) → return { liked: false, likeCount }
     * - If like missing → create it           → return { liked: true,  likeCount }
     * - E11000 on createLike (concurrent duplicate) → treat as already-liked,
     *   return { liked: true, likeCount } without throwing (idempotency)
     * - A user may like their own post — allowed by design
     *
     * M10: Unlike path uses findOneAndDeleteLike (atomic) instead of
     *      findLike + deleteLike (two ops) to prevent TOCTOU race condition.
     */
    async toggleLike(postId, userId) {
        // Verify post exists first
        const post = await postRepo.findById(postId);
        if (!post) throw new NotFoundError("Post not found");

        const existing = await likeRepo.findLike(postId, userId);

        if (existing) {
            // ── Unlike — atomic findOneAndDelete prevents TOCTOU race ─────────
            await likeRepo.findOneAndDeleteLike(postId, userId);
            // If null (already deleted by concurrent request), still report success
            const likeCount = await likeRepo.getLikeCount(postId);
            return { liked: false, likeCount };
        }

        // ── Like ──────────────────────────────────────────────────────────────
        try {
            await likeRepo.createLike(postId, userId);
        } catch (error) {
            // Concurrent duplicate request — the compound index fired.
            // The like was created by another simultaneous request; treat as success.
            if (error.code !== MONGO_DUPLICATE_KEY) throw error;
        }

        const likeCount = await likeRepo.getLikeCount(postId);
        return { liked: true, likeCount };
    }

    // ─── READ ────────────────────────────────────────────────────────────────

    /**
     * GET /posts/:postId/likes
     *
     * Returns paginated list of users who liked the post, plus a like count.
     * Post must exist before querying likes.
     */
    async getLikesForPost(postId, page, limit) {
        const post = await postRepo.findById(postId);
        if (!post) throw new NotFoundError("Post not found");

        return await likeRepo.getLikesByPost(postId, page, limit);
    }
}
