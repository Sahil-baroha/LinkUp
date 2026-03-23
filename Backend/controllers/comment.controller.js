import { CommentService } from "../services/comment.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const commentService = new CommentService();

/**
 * GET /posts/:postId/comments
 * Returns paginated comments: { total, page, limit, comments }.
 */
export const getComments = asyncHandler(async (req, res) => {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await commentService.getComments(req.params.postId, page, limit);
    return ApiResponse.success(res, result, "Comments fetched successfully");
});

/**
 * POST /posts/:postId/comments
 * Add a comment to a post. Returns the newly created comment.
 */
export const addComment = asyncHandler(async (req, res) => {
    const comment = await commentService.addComment(
        req.params.postId,
        req.user.id,
        req.body.body
    );
    return ApiResponse.success(res, { comment }, "Comment added successfully", 201);
});

/**
 * PATCH /posts/:postId/comments/:commentId
 * Edit a comment. Only the comment author can edit.
 */
export const editComment = asyncHandler(async (req, res) => {
    const comment = await commentService.editComment(
        req.params.commentId,
        req.user.id,
        req.body.body
    );
    return ApiResponse.success(res, { comment }, "Comment updated successfully");
});

/**
 * DELETE /posts/:postId/comments/:commentId
 * Delete a comment. Comment author or post author can delete.
 */
export const deleteComment = asyncHandler(async (req, res) => {
    const result = await commentService.removeComment(
        req.params.commentId,
        req.params.postId,
        req.user.id
    );
    return ApiResponse.success(res, null, result.message);
});
