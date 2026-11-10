import { UserService } from "../services/user.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const userService = new UserService();

/**
 * GET /users/suggestions?limit=5
 * Returns connection suggestions ranked by mutual connections then newest.
 */
export const getSuggestions = asyncHandler(async (req, res) => {
    const { limit = 5 } = req.query;
    const suggestions = await userService.getSuggestions(req.user.id, Number(limit));
    return ApiResponse.success(res, suggestions, "Suggestions fetched successfully");
});

/**
 * GET /users/:id
 * Returns a public user profile (no password).
 */
export const getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id, req.user?.id);
    return ApiResponse.success(res, user, "User fetched successfully");
});

/**
 * PATCH /users/:id
 * Updates allowed profile fields.
 * Requires authentication. Users can only update their own profile.
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
    const updates = {};
    if (req.body.name !== undefined) updates.name = typeof req.body.name === "string" ? req.body.name.trim() : req.body.name;
    if (req.body.username !== undefined) updates.username = req.body.username;
    if (req.body.profilePicture !== undefined) updates.profilePicture = req.body.profilePicture;
    if (req.body.headline !== undefined) updates.headline = typeof req.body.headline === "string" ? req.body.headline.trim() : req.body.headline;
    if (req.body.about !== undefined) updates.about = typeof req.body.about === "string" ? req.body.about.trim() : req.body.about;
    if (req.body.location !== undefined) updates.location = typeof req.body.location === "string" ? req.body.location.trim() : req.body.location;
    if (req.body.skills !== undefined) {
        const seen = new Set();
        const dedupedSkills = [];
        for (const s of req.body.skills) {
            const trimmed = typeof s === "string" ? s.trim() : s;
            const lower = typeof trimmed === "string" ? trimmed.toLowerCase() : trimmed;
            if (!seen.has(lower)) {
                seen.add(lower);
                dedupedSkills.push(trimmed);
            }
        }
        updates.skills = dedupedSkills;
    }
    if (req.body.experience !== undefined) updates.experience = req.body.experience;
    if (req.body.education !== undefined) updates.education = req.body.education;
    const user = await userService.updateProfile(req.user.id, req.params.id, updates);
    return ApiResponse.success(res, user, "Profile updated successfully");
});

/**
 * PUT /users/:id/avatar
 * Uploads user avatar image to Cloudinary and updates profile.
 * Restricted to profile owner.
 */
export const uploadUserAvatar = asyncHandler(async (req, res) => {
    const user = await userService.uploadAvatar(req.user.id, req.params.id, req.file);
    return ApiResponse.success(res, user, "Avatar uploaded successfully");
});

/**
 * GET /users/search?q=query&page=1&limit=10
 * Searches users by username or name. Excludes inactive accounts.
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;
    const result = await userService.searchUsers(q, Number(page), Number(limit), req.user?.id);
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
