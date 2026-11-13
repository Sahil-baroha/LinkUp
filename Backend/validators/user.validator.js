import { z } from "zod";

const currentYear = new Date().getFullYear();

const experienceItemSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(100, "Title cannot exceed 100 characters"),
    company: z.string().trim().min(1, "Company is required").max(100, "Company cannot exceed 100 characters"),
    startDate: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "startDate must be in YYYY-MM format"),
    endDate: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "endDate must be in YYYY-MM format").nullable().optional(),
    current: z.boolean().optional().default(false),
    description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
}).refine((data) => {
    if (data.current && data.endDate !== null && data.endDate !== undefined) {
        return false;
    }
    return true;
}, {
    message: "endDate must be null when current is true",
    path: ["endDate"],
}).refine((data) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
        return false;
    }
    return true;
}, {
    message: "endDate must not be before startDate",
    path: ["endDate"],
});

const educationItemSchema = z.object({
    school: z.string().trim().min(1, "School is required").max(100, "School cannot exceed 100 characters"),
    degree: z.string().trim().max(100, "Degree cannot exceed 100 characters").optional(),
    field: z.string().trim().max(100, "Field cannot exceed 100 characters").optional(),
    startYear: z.number().int("startYear must be an integer").min(1950, "startYear must be at least 1950").max(currentYear + 8, "startYear exceeds allowed limit"),
    endYear: z.number().int("endYear must be an integer").nullable().optional(),
}).refine((data) => {
    if (data.startYear !== undefined && data.endYear !== null && data.endYear !== undefined && data.endYear < data.startYear) {
        return false;
    }
    return true;
}, {
    message: "endYear must not be before startYear",
    path: ["endYear"],
});

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1, "Name must be at least 1 character").max(60, "Name cannot exceed 60 characters").optional(),
        username: z.string().min(3, "Username must be at least 3 characters")
            .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
            .optional(),
        headline: z.string().trim().max(120, "Headline cannot exceed 120 characters").optional(),
        about: z.string().trim().max(2000, "About cannot exceed 2000 characters").optional(),
        location: z.string().trim().max(80, "Location cannot exceed 80 characters").optional(),
        skills: z.array(
            z.string().trim().min(1, "Skill must be at least 1 character").max(40, "Skill cannot exceed 40 characters")
        ).max(20, "Skills cannot exceed 20 items").optional(),
        experience: z.array(experienceItemSchema).max(10, "Experience cannot exceed 10 entries").optional(),
        education: z.array(educationItemSchema).max(5, "Education cannot exceed 5 entries").optional(),
    }).strict().refine(data => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    }),
});

export const searchUserSchema = z.object({
    query: z.object({
        q: z.string().min(2, "Search query must be at least 2 characters").max(50, "Search query cannot exceed 50 characters"),
        limit: z.coerce.number().int().min(1).max(50).default(10),
        page: z.coerce.number().int().min(1).default(1),
    }),
});

export const suggestionsSchema = z.object({
    query: z.object({
        limit: z.coerce.number().int().min(1).max(10).default(5),
    }),
});
