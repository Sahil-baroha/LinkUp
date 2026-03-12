import { AuthService } from "../services/auth.service.js";
import { ApiResponse } from "../utils/response.js";
import { asyncHandler } from "../middleware/error-handler.middleware.js";

const authService = new AuthService();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 1000 // 1 hour
};

/**
 * POST /auth/register
 * Creates a new user account. Returns the user object (no password).
 */
export const register = asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);
    return ApiResponse.success(res, user, "Account created successfully", 201);
});

/**
 * POST /auth/login
 * Authenticates a user. Sets an HttpOnly JWT cookie and returns the token
 * in the body for clients that cannot access cookies (e.g. mobile apps).
 */
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    res.cookie("token", token, COOKIE_OPTIONS);
    return ApiResponse.success(res, { user, token }, "Logged in successfully");
});

/**
 * POST /auth/logout
 * Stateless logout — clears the JWT cookie on the client.
 * For full token revocation, implement a Redis blacklist as a future improvement.
 */
export const logout = asyncHandler(async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
    return ApiResponse.success(res, null, "Logged out successfully");
});
