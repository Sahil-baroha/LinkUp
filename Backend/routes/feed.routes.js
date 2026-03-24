import { Router } from "express";
import { getFeed } from "../controllers/feed.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { feedQuerySchema } from "../validators/feed.validator.js";

const router = Router();

// All feed routes require authentication
router.use(authenticate);

// GET /feed — cursor-paginated, enriched post stream from connections
router.get("/", validate(feedQuerySchema), getFeed);

export default router;
