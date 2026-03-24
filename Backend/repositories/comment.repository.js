import Comment from "../models/comments.model.js";

// Author field projection — never expose password or email on comment reads
const AUTHOR_PROJECTION = "username profilePicture";

export class CommentRepository {

    /**
     * Create a new comment document.
     */
    async createComment({ postId, authorId, body }) {
        const comment = new Comment({ postId, authorId, body });
        return await comment.save();
    }

    /**
     * Find a single comment by ID.
     * Not populated — used for ownership checks in the service layer.
     */
    async getCommentById(commentId) {
        return await Comment.findById(commentId);
    }

    /**
     * Paginated comments for a post, newest first.
     * Runs count and find in parallel — single round-trip latency.
     *
     * @returns {{ comments: Comment[], total: Number }}
     */
    async getCommentsByPost(postId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [comments, total] = await Promise.all([
            Comment.find({ postId })
                .populate("authorId", AUTHOR_PROJECTION)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Comment.countDocuments({ postId }),
        ]);

        return { comments, total };
    }

    /**
     * Update a comment's body. Returns the updated document, populated.
     */
    async updateComment(commentId, body) {
        return await Comment.findByIdAndUpdate(
            commentId,
            { $set: { body } },
            { new: true, runValidators: true }
        )
            .populate("authorId", AUTHOR_PROJECTION)
            .lean();
    }

    /**
     * Hard-delete a single comment document.
     */
    async deleteComment(commentId) {
        return await Comment.findByIdAndDelete(commentId);
    }

    /**
     * Cascade-delete all comments for a post.
     * Called when a post is deleted — keeps the collection clean.
     */
    async deleteCommentsByPost(postId) {
        return await Comment.deleteMany({ postId });
    }

    /**
     * Feed Step 4b: Batch aggregate comment counts for a list of post IDs.
     * Single aggregation replaces N individual countDocuments calls.
     *
     * @param {ObjectId[]} postIds
     * @returns {Array<{ _id: ObjectId, count: number }>}
     */
    async getCommentCountsBatch(postIds) {
        return await Comment.aggregate([
            { $match: { postId: { $in: postIds } } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
        ]);
    }
}
