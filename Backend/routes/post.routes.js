import { Router } from "express";
import {
    createPost,
    getPostsByUser,
    getPostById,
    updatePost,
    deletePost,
} from "../controllers/post.controller.js";
import { toggleLike, getLikes } from "../controllers/like.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
    createPostSchema,
    updatePostSchema,
    postIdSchema,
    userIdParamSchema,
} from "../validators/post.validator.js";

const router = Router();

// All post routes require authentication
router.use(authenticate);

// ── CRITICAL: /user/:userId must be declared BEFORE /:postId ────────────────
// If /:postId comes first, Express will match "user" as a postId value.

// GET /posts/user/:userId — all posts by a user
router.get("/user/:userId", validate(userIdParamSchema), getPostsByUser);

// POST /posts — create a post (text + optional image)
router.post("/", uploadSingle, validate(createPostSchema), createPost);

// GET /posts/:postId — single post
router.get("/:postId", validate(postIdSchema), getPostById);

// PATCH /posts/:postId — edit post (text and/or image)
router.patch("/:postId", uploadSingle, validate(updatePostSchema), updatePost);

// DELETE /posts/:postId — delete post
router.delete("/:postId", validate(postIdSchema), deletePost);

// ── Like routes ───────────────────────────────────────────────────────────────
// POST  /posts/:postId/like  — toggle like/unlike
router.post("/:postId/like", validate(postIdSchema), toggleLike);

// GET   /posts/:postId/likes — paginated like list + count
router.get("/:postId/likes", validate(postIdSchema), getLikes);

export default router;
