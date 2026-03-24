import { z } from "zod";

// Feed query param validation
export const feedQuerySchema = z.object({
    query: z.object({
        // cursor: optional ISO 8601 datetime string — must be parseable as a Date
        cursor: z
            .string()
            .datetime({ message: "cursor must be a valid ISO 8601 datetime string" })
            .optional(),

        // limit: optional integer between 1 and 50, defaults to 10
        limit: z
            .string()
            .optional()
            .transform((val) => (val === undefined ? 10 : parseInt(val, 10)))
            .pipe(
                z.number()
                    .int("limit must be an integer")
                    .min(1, "limit must be at least 1")
                    .max(50, "limit cannot exceed 50")
            ),
    }),
});
