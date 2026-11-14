import jwt from "jsonwebtoken";
import { userRepo } from "../repositories/user.repository.js";
import { AppError, UnauthorizedError } from "../utils/errors.js";
import { env } from "../config/env.js";

export const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
            throw new UnauthorizedError("No token provided");
        }

        const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });

        // C1: Cache-aside user load — verify the account is still active.
        // userRepo.findById uses Redis (plain object on hit) falling back to Mongo
        // (.toObject() stored in cache). Never call document methods on the result.
        // findById does NOT filter inactive users, so we check explicitly here.
        const user = await userRepo.findById(payload.id);

        if (!user) {
            throw new UnauthorizedError("User not found");
        }

        // Reject deactivated accounts immediately — even with a valid unexpired token
        if (user.active === false) {
            throw new UnauthorizedError("Account has been deactivated");
        }

        // Keep req.user.id exactly as controllers expect (a string).
        // _id from a cache hit (plain JSON) is already a string;
        // _id from a fresh Mongoose toObject() may be an ObjectId — coerce with String().
        req.user = { id: String(user._id) };

        next();
    } catch (error) {
        // Pass operational errors (AppError subclasses) directly to error handler
        if (error instanceof AppError) {
            return next(error);
        }
        // M4/M5: Distinguish expired token from tampered/malformed token so
        // the frontend can decide whether to prompt re-login or flag a security issue.
        if (error.name === "TokenExpiredError") {
            return next(new UnauthorizedError("Token expired, please log in again"));
        }
        return next(new UnauthorizedError("Invalid token"));
    }
};
