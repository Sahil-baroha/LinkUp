import rateLimit from "express-rate-limit";

// M1: Rate limiter for auth routes (register + login)
// 20 requests per 15-minute window per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
});
