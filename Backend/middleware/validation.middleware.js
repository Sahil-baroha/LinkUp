import { ZodError } from "zod";
import { ValidationError } from "../utils/errors.js";

export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            const isZodError =
                error instanceof ZodError ||
                error?.name === "ZodError" ||
                (error && Array.isArray(error.issues));

            if (isZodError) {
                const errors = (error.issues || []).map((err) => ({
                    field: Array.isArray(err.path) ? err.path.join(".") : String(err.path ?? ""),
                    message: err.message,
                }));
                next(new ValidationError("Validation failed", errors));
            } else {
                next(error);
            }
        }
    };
};
