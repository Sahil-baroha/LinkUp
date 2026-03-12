import { UserService } from "../services/user.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const userService = new UserService();

/**
 * GET /users/:id
 * Returns a public user profile (no password).
 */
export const getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    return ApiResponse.success(res, user, "User fetched successfully");
});

/**
 * PATCH /users/:id
 * Updates only username and/or profilePicture.
 * Requires authentication. Users can only update their own profile.
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, user, "Profile updated successfully");
});

/**
 * GET /users/search?q=query&page=1&limit=10
 * Searches users by username or name. Excludes inactive accounts.
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;
    const result = await userService.searchUsers(q, Number(page), Number(limit));
    return ApiResponse.success(res, result, "Search completed successfully");
});

/**
 * DELETE /users/:id
 * Soft-deletes (deactivates) the user account. Does not remove data.
 * Requires authentication. Users can only deactivate their own account.
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const result = await userService.deactivateAccount(req.user.id, req.params.id);
    return ApiResponse.success(res, null, result.message);
});