import { Router } from "express";
import { register, login, logout } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";
import { authIpLimiter, loginAccountLimiter } from "../middleware/rateLimiter.middleware.js";

const router = Router();

// POST /auth/register — rate limited by IP (20 per 15 min)
router.post("/register", authIpLimiter, validate(registerSchema), register);

// POST /auth/login — rate limited by IP and by account (failed attempts)
router.post("/login", authIpLimiter, loginAccountLimiter, validate(loginSchema), login);

// POST /auth/logout
router.post("/logout", logout);

export default router;
