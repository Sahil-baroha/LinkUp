import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ID format");

// POST /posts — body validation (image handled by multer, not zod)
export const createPostSchema = z.object({
    body: z.object({
        body: z
            .string()
            .min(1, "Post body cannot be empty")
            .max(3000, "Post body cannot exceed 3000 characters")
            .refine((val) => val.trim().length > 0, "Post body cannot be whitespace only"),
    }),
});

// PATCH /posts/:postId — edit validation
export const updatePostSchema = z.object({
    params: z.object({
        postId: objectIdSchema,
    }),
    body: z.object({
        body: z
            .string()
            .min(1, "Post body cannot be empty")
            .max(3000, "Post body cannot exceed 3000 characters")
            .refine((val) => val.trim().length > 0, "Post body cannot be whitespace only")
            .optional(),
    }),
});

// GET|DELETE /posts/:postId
export const postIdSchema = z.object({
    params: z.object({
        postId: objectIdSchema,
    }),
});

// GET /posts/user/:userId
export const userIdParamSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
});

// POST /posts/:postId/comments — comment body validation
export const commentBodySchema = z.object({
    params: z.object({
        postId: objectIdSchema,
    }),
    body: z.object({
        body: z
            .string()
            .min(1, "Comment cannot be empty")
            .max(1000, "Comment cannot exceed 1000 characters")
            .refine((val) => val.trim().length > 0, "Comment cannot be whitespace only"),
    }),
});

// PATCH|DELETE /posts/:postId/comments/:commentId — both params required
export const commentParamsSchema = z.object({
    params: z.object({
        postId: objectIdSchema,
        commentId: objectIdSchema,
    }),
});

// PATCH /posts/:postId/comments/:commentId — params + body
export const editCommentSchema = z.object({
    params: z.object({
        postId: objectIdSchema,
        commentId: objectIdSchema,
    }),
    body: z.object({
        body: z
            .string()
            .min(1, "Comment cannot be empty")
            .max(1000, "Comment cannot exceed 1000 characters")
            .refine((val) => val.trim().length > 0, "Comment cannot be whitespace only"),
    }),
});
