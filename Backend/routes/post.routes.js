import { Router } from "express";
import {
    createPost,
    getPostsByUser,
    getPostById,
    updatePost,
    deletePost,
} from "../controllers/post.controller.js";
import { toggleLike, getLikes } from "../controllers/like.controller.js";
import { getComments, addComment, editComment, deleteComment } from "../controllers/comment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
    createPostSchema,
    updatePostSchema,
    postIdSchema,
    userIdParamSchema,
    commentBodySchema,
    commentParamsSchema,
    editCommentSchema,
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

// ── Comment routes ────────────────────────────────────────────────────────────
// GET    /posts/:postId/comments  — paginated comment list
router.get("/:postId/comments", validate(postIdSchema), getComments);

// POST   /posts/:postId/comments  — add a comment
router.post("/:postId/comments", validate(commentBodySchema), addComment);

// PATCH  /posts/:postId/comments/:commentId  — edit a comment
router.patch("/:postId/comments/:commentId", validate(editCommentSchema), editComment);

// DELETE /posts/:postId/comments/:commentId  — delete a comment
router.delete("/:postId/comments/:commentId", validate(commentParamsSchema), deleteComment);

export default router;
