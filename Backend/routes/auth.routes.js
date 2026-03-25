import { Router } from "express";
import { register, login, logout } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { authLimiter } from "../server.js";

const router = Router();

// POST /auth/register — rate limited (M1)
router.post("/register", authLimiter, validate(registerSchema), register);

// POST /auth/login — rate limited (M1)
router.post("/login", authLimiter, validate(loginSchema), login);

// POST /auth/logout
router.post("/logout", logout);

export default router;
