import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors.js";

export class UserService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    async register(userData) {
        const existingUser = await this.userRepository.checkExists(userData.email, userData.username);
        if (existingUser) {
            throw new ConflictError("User with this email or username already exists");
        }

        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const user = await this.userRepository.create({
            ...userData,
            password: hashedPassword,
        });

        const { password, ...userWithoutPassword } = user.toObject();
        return userWithoutPassword;
    }

    async login(email, password) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const token = this.generateToken({ id: user._id });

        const { password: _, ...userWithoutPassword } = user.toObject();
        return { user: userWithoutPassword, token };
    }

    async updateProfilePicture(userId, filePath) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const updatedUser = await this.userRepository.update(userId, { profilePicture: filePath });
        const { password, ...userWithoutPassword } = updatedUser.toObject();
        return userWithoutPassword;
    }

    async updateProfile(userId, updateData) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("User not found");
        }

        if (updateData.email || updateData.username) {
            const existingUser = await this.userRepository.checkExists(updateData.email, updateData.username);
            if (existingUser && String(existingUser._id) !== String(userId)) {
                throw new ConflictError("Email or username is already taken");
            }
        }

        const updatedUser = await this.userRepository.update(userId, updateData);
        const { password, ...userWithoutPassword } = updatedUser.toObject();
        return userWithoutPassword;
    }

    generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    }
}
