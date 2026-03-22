import Like from "../models/like.model.js";

// User field projection — only expose public fields
const USER_PROJECTION = "username profilePicture";

export class LikeRepository {

    /**
     * Find a single like document for a user/post pair.
     */
    async findLike(postId, userId) {
        return await Like.findOne({ postId, userId });
    }

    /**
     * Create a like document.
     * The compound unique index { postId, userId } is the DB-level guard —
     * callers must handle E11000 for concurrent duplicate requests.
     */
    async createLike(postId, userId) {
        const like = new Like({ postId, userId });
        return await like.save();
    }

    /**
     * Delete a like document (unlike action).
     */
    async deleteLike(postId, userId) {
        return await Like.deleteOne({ postId, userId });
    }

    /**
     * Count all likes for a given post.
     * Always derived from the collection — never a stored counter on Post.
     */
    async getLikeCount(postId) {
        return await Like.countDocuments({ postId });
    }

    /**
     * Paginated list of users who liked a post.
     * Populates userId with public fields only.
     */
    async getLikesByPost(postId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [users, likeCount] = await Promise.all([
            Like.find({ postId })
                .populate("userId", USER_PROJECTION)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Like.countDocuments({ postId }),
        ]);

        return { likeCount, users: users.map(l => l.userId), page, limit };
    }
}
