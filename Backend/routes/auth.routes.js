import { Router } from "express";
import { register, login, logout } from "../controllers/auth.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";

const router = Router();

// POST /auth/register
router.post("/register", validate(registerSchema), register);

// POST /auth/login
router.post("/login", validate(loginSchema), login);

// POST /auth/logout
router.post("/logout", logout);

export default router;
