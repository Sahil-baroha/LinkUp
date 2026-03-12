import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors.js";

const userRepository = new UserRepository();

export class AuthService {
    /**
     * Register a new user.
     * Hashes the password and removes it from the returned payload.
     */
    async register(userData) {
        const existingUser = await userRepository.checkExists(userData.email, userData.username);
        if (existingUser) {
            throw new ConflictError("An account with this email or username already exists");
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await userRepository.create({
            ...userData,
            password: hashedPassword,
        });

        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;
    }

    /**
     * Authenticate a user and return a signed JWT.
     * Throws UnauthorizedError for any credential mismatch (intentionally vague for security).
     */
    async login(email, password) {
        // findByEmail returns full document (including password) for comparison
        const user = await userRepository.findByEmail(email);
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

        const token = this._generateToken({ id: user._id });
        const { password: _, ...userWithoutPassword } = user.toObject();
        return { user: userWithoutPassword, token };
    }

    /**
     * Generate a signed JWT. Token is stateless — logout is handled client-side
     * by clearing the cookie. For server-side invalidation, add a token blacklist
     * in Redis as a future step.
     */
    _generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    }
}
