import { z } from "zod";

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ID format");

// POST /connections/request/:userId
export const sendRequestSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
});

// PATCH /connections/accept/:requestId
export const acceptRequestSchema = z.object({
    params: z.object({
        requestId: objectIdSchema,
    }),
});

// PATCH /connections/reject/:requestId
export const rejectRequestSchema = z.object({
    params: z.object({
        requestId: objectIdSchema,
    }),
});

// DELETE /connections/withdraw/:requestId
export const withdrawRequestSchema = z.object({
    params: z.object({
        requestId: objectIdSchema,
    }),
});

// DELETE /connections/remove/:userId
export const removeConnectionSchema = z.object({
    params: z.object({
        userId: objectIdSchema,
    }),
});
