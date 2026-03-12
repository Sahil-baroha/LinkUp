import { Router } from "express";
import multer from "multer";

import { getUserById, updateUserProfile, searchUsers, deleteUser } from "../controllers/user.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { updateUserSchema, searchUserSchema } from "../validators/user.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});

const upload = multer({ storage });

// GET /users/search — must be defined BEFORE /users/:id to avoid :id catching "search"
router.get("/search", authenticate, validate(searchUserSchema), searchUsers);

// GET /users/:id
router.get("/:id", authenticate, getUserById);

// PATCH /users/:id — restricted to username and profilePicture only
router.patch("/:id", authenticate, validate(updateUserSchema), updateUserProfile);

// DELETE /users/:id — soft delete (sets active = false)
router.delete("/:id", authenticate, deleteUser);

export default router;