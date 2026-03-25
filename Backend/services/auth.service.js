import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userRepo } from "../repositories/user.repository.js";
import { ConflictError, UnauthorizedError } from "../utils/errors.js";

export class AuthService {
    /**
     * Register a new user.
     * Hashes the password and removes it from the returned payload.
     */
    async register(userData) {
        const existingUser = await userRepo.checkExists(userData.email, userData.username);
        if (existingUser) {
            throw new ConflictError("An account with this email or username already exists");
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await userRepo.create({
            ...userData,
            password: hashedPassword,
        });

        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;
    }

    /**
     * Authenticate a user and return a signed JWT.
     * Throws UnauthorizedError for any credential mismatch (intentionally vague for security).
     *
     * C5: userRepo.findByUsername and findByEmail return either a Mongoose document
     * (first DB hit) or a plain object (cache hit). findByEmail is not cached,
     * so it always returns a Mongoose document — .toObject() is safe here.
     */
    async login(email, password) {
        // findByEmail is never cached — returns full Mongoose document (including password)
        const user = await userRepo.findByEmail(email);
        if (!user) {
            throw new UnauthorizedError("Invalid email or password");
        }

        if (!user.active) {
            throw new UnauthorizedError("This account has been deactivated");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const token = this.#generateToken({ id: user._id });
        // m7: user here is a Mongoose document (findByEmail is not cached), so .toObject() is safe
        const { password: _, ...userWithoutPassword } = user.toObject();
        return { user: userWithoutPassword, token };
    }

    /**
     * Generate a signed JWT. Token is stateless — logout is handled client-side
     * by clearing the cookie. For server-side invalidation, add a token blacklist
     * in Redis as a future step.
     *
     * m7: Using ES2022 private class field (#generateToken) instead of the
     * conventional _generateToken prefix which is not enforced by the runtime.
     */
    #generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    }
}
