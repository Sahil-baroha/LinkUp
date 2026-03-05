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
        next(new UnauthorizedError("Invalid or expired token"));
    }
};
