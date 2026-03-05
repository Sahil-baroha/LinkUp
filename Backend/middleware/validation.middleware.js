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
            if (error instanceof ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                }));
                next(new ValidationError("Validation failed", errors));
            } else {
                next(error);
            }
        }
    };
};
