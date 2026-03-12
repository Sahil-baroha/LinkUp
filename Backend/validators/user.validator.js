import { z } from "zod";

export const updateUserSchema = z.object({
    body: z.object({
        username: z.string().min(3, "Username must be at least 3 characters")
            .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
            .optional(),
        profilePicture: z.string().url("Profile picture must be a valid URL").optional(),
    }).refine(data => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    }),
});

export const searchUserSchema = z.object({
    query: z.object({
        q: z.string().min(1, "Search query is required"),
        limit: z.coerce.number().int().min(1).max(50).default(10),
        page: z.coerce.number().int().min(1).default(1),
    }),
});
