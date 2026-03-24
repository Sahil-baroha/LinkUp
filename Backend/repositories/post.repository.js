import Post from "../models/posts.model.js";

// Author field projection — never expose password or email on post reads
const AUTHOR_PROJECTION = "username profilePicture";

export class PostRepository {

    /**
     * Create a new post document.
     * @param {{ authorId, body, image?: { url, publicId } }} data
     */
    async create({ authorId, body, image }) {
        const post = new Post({ authorId, body, image });
        return await post.save();
    }

    /**
     * Find a single post by ID, populating author's public fields.
     */
    async findById(postId) {
        return await Post.findById(postId)
            .populate("authorId", AUTHOR_PROJECTION)
            .lean();
    }

    /**
     * Find all posts by a user, newest first. Populate author.
     * Designed for future cursor-based pagination — add cursor param later.
     */
    async findByAuthor(userId) {
        return await Post.find({ authorId: userId })
            .populate("authorId", AUTHOR_PROJECTION)
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Partial update — only supply the fields that changed.
     * Returns the updated document.
     */
    async update(postId, fields) {
        return await Post.findByIdAndUpdate(
            postId,
            { $set: fields },
            { new: true, runValidators: true }
        )
            .populate("authorId", AUTHOR_PROJECTION)
            .lean();
    }

    /**
     * Hard-delete a post document.
     * Cloudinary cleanup is handled by the service before this is called.
     */
    async delete(postId) {
        return await Post.findByIdAndDelete(postId);
    }

    /**
     * Feed Step 2: Fetch paginated posts from a set of authors.
     * Cursor-based: fetches documents with createdAt < cursor, newest first.
     * Fetches limit + 1 — caller uses the extra document to determine hasMore
     * without an additional countDocuments call.
     *
     * @param {ObjectId[]} userIds   - Array of author IDs to include
     * @param {Date}       cursor    - Only return posts older than this date
     * @param {number}     limit     - Max posts to return (actual slice is limit + 1)
     */
    async getFeedPosts(userIds, cursor, limit) {
        return await Post.find({
            authorId: { $in: userIds },
            createdAt: { $lt: cursor },
        })
            .populate("authorId", AUTHOR_PROJECTION)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();
    }
}
