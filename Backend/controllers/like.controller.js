import { LikeService } from "../services/like.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const likeService = new LikeService();

/**
 * POST /posts/:postId/like
 * Toggle like/unlike. Returns { liked: Boolean, likeCount: Number }.
 */
export const toggleLike = asyncHandler(async (req, res) => {
    const result = await likeService.toggleLike(req.params.postId, req.user.id);
    return ApiResponse.success(res, result, result.liked ? "Post liked" : "Post unliked");
});

/**
 * GET /posts/:postId/likes
 * Returns paginated like data: { likeCount, users, page, limit }.
 */
export const getLikes = asyncHandler(async (req, res) => {
    const page  = Number(req.query.page)  || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await likeService.getLikesForPost(req.params.postId, page, limit);
    return ApiResponse.success(res, result, "Likes fetched successfully");
});
