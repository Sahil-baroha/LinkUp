import dotenv from "dotenv";
import { z } from "zod";

// Load .env before validating environment variables
dotenv.config();

const emptyToUndefined = (v) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const envSchema = z.object({
    MONGO_URL: z.string({ error: "MONGO_URL is required" }).min(1, "MONGO_URL cannot be empty"),

    JWT_SECRET: z.string({ error: "JWT_SECRET is required" }).min(32, "JWT_SECRET must be at least 32 characters"),

    CLIENT_URL: z.string({ error: "CLIENT_URL is required" }).url("CLIENT_URL must be a valid URL"),

    NODE_ENV: z.enum(["development", "test", "production"], {
        error: "NODE_ENV must be development, test, or production",
    }).default("development"),

    PORT: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int("PORT must be an integer").default(5000)
    ),

    TRUST_PROXY: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int("TRUST_PROXY must be an integer").min(0, "TRUST_PROXY must be >= 0").default(0)
    ),

    DNS_SERVERS: z.preprocess(emptyToUndefined, z.string().optional()),

    REDIS_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    REDIS_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
    REDIS_PORT: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int("REDIS_PORT must be an integer").optional()
    ),

    REDIS_COMMAND_TIMEOUT_MS: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int("REDIS_COMMAND_TIMEOUT_MS must be an integer").min(1).default(250)
    ),
    REDIS_CONNECT_TIMEOUT_MS: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int("REDIS_CONNECT_TIMEOUT_MS must be an integer").min(1).default(2000)
    ),
    MONGO_MAX_POOL_SIZE: z.preprocess(
        emptyToUndefined,
        z.coerce.number().int("MONGO_MAX_POOL_SIZE must be an integer").min(1).default(10)
    ),
    DEBUG_IP_ENDPOINT: z.preprocess(
        (v) => {
            if (typeof v === "string") {
                const lower = v.trim().toLowerCase();
                if (lower === "true" || lower === "1") return true;
                if (lower === "false" || lower === "0" || lower === "") return false;
            }
            return v;
        },
        z.boolean().default(false)
    ),

    CLOUDINARY_CLOUD_NAME: z.preprocess(emptyToUndefined, z.string().optional()),
    CLOUDINARY_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    CLOUDINARY_API_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
}).superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
        if (!data.CLOUDINARY_CLOUD_NAME) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["CLOUDINARY_CLOUD_NAME"],
                message: "CLOUDINARY_CLOUD_NAME is required when NODE_ENV is production",
            });
        }
        if (!data.CLOUDINARY_API_KEY) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["CLOUDINARY_API_KEY"],
                message: "CLOUDINARY_API_KEY is required when NODE_ENV is production",
            });
        }
        if (!data.CLOUDINARY_API_SECRET) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["CLOUDINARY_API_SECRET"],
                message: "CLOUDINARY_API_SECRET is required when NODE_ENV is production",
            });
        }
    }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Environment validation failed:");
    for (const issue of result.error.issues) {
        const varName = issue.path.join(".") || "UNKNOWN_ENV_VAR";
        console.error(`- ${varName}: ${issue.message}`);
    }
    process.exit(1);
}

export const env = Object.freeze(result.data);
