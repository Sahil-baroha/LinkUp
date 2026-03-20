import { PostRepository } from "../repositories/post.repository.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors.js";

const postRepo = new PostRepository();

export class PostService {

    // ─── CREATE ──────────────────────────────────────────────────────────────

    /**
     * Create a new post. Handles optional image upload.
     * If Cloudinary upload fails, the post is NOT created (atomic intent).
     *
     * Business rules enforced: authenticated via middleware, MIME via multer,
     * body required and non-whitespace, image optional, 5MB limit via multer.
     */
    async createPost(authorId, body, file) {
        let image = { url: null, publicId: null };

        if (file) {
            // Upload to Cloudinary — if this throws, we never reach the DB
            image = await uploadToCloudinary(file.buffer, file.mimetype, "linkup/posts");
        }

        return await postRepo.create({ authorId, body: body.trim(), image });
    }

    // ─── READ ────────────────────────────────────────────────────────────────

    /**
     * GET /posts/:postId — any authenticated user can read any post.
     */
    async getPostById(postId) {
        const post = await postRepo.findById(postId);
        if (!post) throw new NotFoundError("Post not found");
        return post;
    }

    /**
     * GET /posts/user/:userId — all posts by a specific user, newest first.
     */
    async getPostsByUser(userId) {
        return await postRepo.findByAuthor(userId);
    }

    // ─── UPDATE ──────────────────────────────────────────────────────────────

    /**
     * PATCH /posts/:postId
     *
     * Rules enforced:
     * - Only author can edit
     * - Editing non-existent post → 404
     * - At least one field must differ from current values → 400
     * - New image: delete old from Cloudinary, upload new
     * - No new image: leave existing image untouched
     * - Empty body after trim → 400
     */
    async updatePost(postId, requesterId, newBody, file) {
        const post = await postRepo.findById(postId);
        if (!post) throw new NotFoundError("Post not found");

        // Ownership check (using .toString() since .lean() returns plain objects)
        if (post.authorId._id.toString() !== requesterId.toString()) {
            throw new ForbiddenError("You can only edit your own posts");
        }

        const updates = {};
        let hasChange = false;

        // ── Body update ───────────────────────────────────────────────────────
        if (newBody !== undefined) {
            const trimmed = newBody.trim();
            if (trimmed.length === 0) throw new BadRequestError("Post body cannot be empty");
            if (trimmed !== post.body) {
                updates.body = trimmed;
                hasChange = true;
            }
        }

        // ── Image update ──────────────────────────────────────────────────────
        if (file) {
            // Delete old Cloudinary asset if one exists
            if (post.image?.publicId) {
                await deleteFromCloudinary(post.image.publicId);
            }
            // Upload new image — if this throws, we abort the update
            const uploaded = await uploadToCloudinary(file.buffer, file.mimetype, "linkup/posts");
            updates.image = { url: uploaded.url, publicId: uploaded.publicId };
            hasChange = true;
        }

        // ── Semantic no-op guard ──────────────────────────────────────────────
        if (!hasChange) {
            throw new BadRequestError(
                "No changes detected — the new values are identical to the current post"
            );
        }

        return await postRepo.update(postId, updates);
    }

    // ─── DELETE ──────────────────────────────────────────────────────────────

    /**
     * DELETE /posts/:postId
     *
     * Rules enforced:
     * - Only author can delete
     * - If post has a Cloudinary image: attempt deletion first
     * - If Cloudinary deletion fails: log the error, still delete the post document
     *   (dangling asset is preferable to a broken user experience)
     */
    async deletePost(postId, requesterId) {
        const post = await postRepo.findById(postId);
        if (!post) throw new NotFoundError("Post not found");

        if (post.authorId._id.toString() !== requesterId.toString()) {
            throw new ForbiddenError("You can only delete your own posts");
        }

        if (post.image?.publicId) {
            const deleted = await deleteFromCloudinary(post.image.publicId);
            if (!deleted) {
                console.error(
                    `[PostService] Cloudinary cleanup failed for publicId: ${post.image.publicId}. Post document will still be deleted.`
                );
            }
        }

        await postRepo.delete(postId);
        return { message: "Post deleted successfully" };
    }
}
