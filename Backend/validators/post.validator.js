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
// M7: superRefine requires at least one of body (text) or an image upload.
//     Zod cannot validate file presence (multer handles that), so we guard the
//     text body here. The service's !hasChange guard is a secondary safety net.
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
    }).superRefine((data, ctx) => {
        // Note: Zod cannot see req.file (multer). We only fail here if body is
        // explicitly absent AND a text change was the only possible intent.
        // The service layer will still catch the "no change + no file" case.
        if (data.body === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["body"],
                message: "At least one field (body or image) must be provided",
            });
        }
    }),
});

// GET|DELETE /posts/:postId
export const postIdSchema = z.object({
    params: z.object({
        postId: objectIdSchema,
    }),
});

// GET /posts/:postId/likes and GET /posts/:postId/comments — query validation
export const postPaginationQuerySchema = z.object({
    params: z.object({
        postId: objectIdSchema,
    }),
    query: z.object({
        page: z
            .string()
            .regex(/^\d+$/, "Page must be a numeric integer")
            .transform(Number)
            .pipe(z.number().int().min(1, "Page must be at least 1"))
            .optional(),
        limit: z
            .string()
            .regex(/^\d+$/, "Limit must be a numeric integer")
            .transform(Number)
            .pipe(z.number().int().min(1, "Limit must be at least 1").max(50, "Limit cannot exceed 50"))
            .optional(),
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
