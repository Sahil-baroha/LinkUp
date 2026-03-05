import { UserService } from "../services/user.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const userService = new UserService();

export const register = asyncHandler(async (req, res) => {
    const user = await userService.register(req.body);
    return ApiResponse.success(res, user, "User registered successfully", 201);
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await userService.login(email, password);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 60 * 60 * 1000 });
    return ApiResponse.success(res, { user, token }, "User logged in successfully");
});

export const uploadProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) {
        return ApiResponse.error(res, "No file uploaded", 400);
    }
    const user = await userService.updateProfilePicture(req.user.id, req.file.path);
    return ApiResponse.success(res, { profilePicture: user.profilePicture }, "Profile picture uploaded successfully");
});

export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);
    return ApiResponse.success(res, user, "User updated successfully");
});