import { AppError, ValidationError } from "../utils/errors.js";
import { ApiResponse } from "../utils/response.js";

export const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return ApiResponse.error(
            res,
            err.message,
            err.statusCode,
            err instanceof ValidationError ? err.errors : undefined
        );
    }

    // Log unexpected errors
    console.error({
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    const message =
        process.env.NODE_ENV === "production" ? "Internal server error" : err.message;
    return ApiResponse.error(res, message, 500);
};

export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
