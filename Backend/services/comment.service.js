import { commentRepo } from "../repositories/comment.repository.js";
import { postRepo } from "../repositories/post.repository.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../utils/errors.js";

export class CommentService {

    // ─── CREATE ──────────────────────────────────────────────────────────────

    /**
     * POST /posts/:postId/comments
     *
     * Rules enforced:
     * - Post must exist before creating a comment
     * - body is required, non-whitespace, max 1000 chars (Mongoose enforces max at DB level)
     * - authorId is always set from req.user.id — client never sends it
     */
    async addComment(postId, userId, body) {
        const post = await postRepo.findById(postId);
        if (!post) throw new NotFoundError("Post not found");

        return await commentRepo.createComment({ postId, authorId: userId, body: body.trim() });
    }

    // ─── READ ────────────────────────────────────────────────────────────────

    /**
     * GET /posts/:postId/comments
     *
     * Rules enforced:
     * - Post must exist before returning comments
     * - Any authenticated user can view comments on any post
     */
    async getComments(postId, page, limit) {
        const post = await postRepo.findById(postId);
        if (!post) throw new NotFoundError("Post not found");

        const { comments, total } = await commentRepo.getCommentsByPost(postId, page, limit);
        return { total, page, limit, comments };
    }

    // ─── UPDATE ──────────────────────────────────────────────────────────────

    /**
     * PATCH /posts/:postId/comments/:commentId
     *
     * Rules enforced:
     * - Comment must exist
     * - Only the comment author can edit
     * - New body cannot be empty or whitespace only
     * - No-op guard: identical body → BadRequestError (no pointless DB write)
     */
    async editComment(commentId, userId, body) {
        const comment = await commentRepo.getCommentById(commentId);
        if (!comment) throw new NotFoundError("Comment not found");

        if (!comment.authorId.equals(userId)) {
            throw new ForbiddenError("You can only edit your own comments");
        }

        const trimmed = body.trim();

        if (trimmed.length === 0) {
            throw new BadRequestError("Comment body cannot be empty");
        }

        if (trimmed === comment.body) {
            throw new BadRequestError("No changes detected");
        }

        return await commentRepo.updateComment(commentId, trimmed);
    }

    // ─── DELETE ──────────────────────────────────────────────────────────────

    /**
     * DELETE /posts/:postId/comments/:commentId
     *
     * Authorization logic:
     * - First check: is the requester the comment author? → allow
     * - Second check (only if first fails): is the requester the post author? → allow
     * - Both checks fail → ForbiddenError
     *
     * The post is only fetched when the comment ownership check fails —
     * avoids an unnecessary DB call in the common case (owner deletes own comment).
     */
    async removeComment(commentId, postId, userId) {
        const comment = await commentRepo.getCommentById(commentId);
        if (!comment) throw new NotFoundError("Comment not found");

        const isCommentAuthor = comment.authorId.equals(userId);

        if (!isCommentAuthor) {
            // Escalate: check if the requester is the post author
            const post = await postRepo.findById(postId);
            const isPostAuthor = post && post.authorId._id.toString() === userId.toString();

            if (!isPostAuthor) {
                throw new ForbiddenError("You do not have permission to delete this comment");
            }
        }

        await commentRepo.deleteComment(commentId);
        return { message: "Comment deleted" };
    }
}
