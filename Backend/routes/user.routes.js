import { Router } from "express";
import { getUserById, updateUserProfile, searchUsers, deleteUser } from "../controllers/user.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { updateUserSchema, searchUserSchema } from "../validators/user.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

// C1: Import the ObjectId param schema — reused from post.validator.js
// (same /^[a-f\d]{24}$/i pattern, avoids duplicating the definition)
import { z } from "zod";
const objectIdRegex = /^[a-f\d]{24}$/i;
const userIdParamSchema = z.object({
    params: z.object({
        id: z.string().regex(objectIdRegex, "Invalid user ID format"),
    }),
});

const router = Router();

// GET /users/search — must be defined BEFORE /users/:id to avoid :id catching "search"
router.get("/search", authenticate, validate(searchUserSchema), searchUsers);

// GET /users/:id — C1: validate :id is a valid ObjectId before it reaches Mongoose
router.get("/:id", authenticate, validate(userIdParamSchema), getUserById);

// PATCH /users/:id — restricted to username and profilePicture only
router.patch("/:id", authenticate, validate(userIdParamSchema), validate(updateUserSchema), updateUserProfile);

// DELETE /users/:id — soft delete (sets active = false) — C1: validate :id
router.delete("/:id", authenticate, validate(userIdParamSchema), deleteUser);

export default router;