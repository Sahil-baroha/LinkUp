import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required"),
        username: z.string().min(3, "Username must be at least 3 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required").optional(),
        username: z.string().min(3, "Username must be at least 3 characters").optional(),
        email: z.string().email("Invalid email address").optional(),
    }),
});
