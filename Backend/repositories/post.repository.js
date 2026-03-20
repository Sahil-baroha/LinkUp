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
}
