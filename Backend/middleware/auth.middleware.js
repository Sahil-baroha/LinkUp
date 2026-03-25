import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../utils/errors.js";

export const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
            throw new UnauthorizedError("No token provided");
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (error) {
        // M4/M5: Distinguish expired token from tampered/malformed token so
        // the frontend can decide whether to prompt re-login or flag a security issue.
        if (error.name === "TokenExpiredError") {
            return next(new UnauthorizedError("Token expired, please log in again"));
        }
        return next(new UnauthorizedError("Invalid token"));
    }
};
