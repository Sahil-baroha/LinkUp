import { PostService } from "../services/post.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const postService = new PostService();

/**
 * POST /posts
 * Create a new post. Image is optional — body is always required.
 */
export const createPost = asyncHandler(async (req, res) => {
    const post = await postService.createPost(req.user.id, req.body.body, req.file);
    return ApiResponse.success(res, post, "Post created successfully", 201);
});

/**
 * GET /posts/user/:userId
 * Get all posts by a specific user (newest first).
 */
export const getPostsByUser = asyncHandler(async (req, res) => {
    const posts = await postService.getPostsByUser(req.params.userId);
    return ApiResponse.success(res, posts, "Posts fetched successfully");
});

/**
 * GET /posts/:postId
 * Get a single post by its ID.
 */
export const getPostById = asyncHandler(async (req, res) => {
    const post = await postService.getPostById(req.params.postId);
    return ApiResponse.success(res, post, "Post fetched successfully");
});

/**
 * PATCH /posts/:postId
 * Edit a post's body and/or image. Only the author can edit.
 */
export const updatePost = asyncHandler(async (req, res) => {
    const post = await postService.updatePost(
        req.params.postId,
        req.user.id,
        req.body.body,
        req.file
    );
    return ApiResponse.success(res, post, "Post updated successfully");
});

/**
 * DELETE /posts/:postId
 * Delete a post. Only the author can delete. Cleans up Cloudinary image if present.
 */
export const deletePost = asyncHandler(async (req, res) => {
    const result = await postService.deletePost(req.params.postId, req.user.id);
    return ApiResponse.success(res, null, result.message);
});
