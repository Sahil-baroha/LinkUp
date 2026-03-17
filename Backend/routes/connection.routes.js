import { Router } from "express";
import {
    getMyConnections,
    getIncomingRequests,
    getOutgoingRequests,
    sendRequest,
    acceptRequest,
    rejectRequest,
    withdrawRequest,
    removeConnection,
} from "../controllers/connection.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
    sendRequestSchema,
    acceptRequestSchema,
    rejectRequestSchema,
    withdrawRequestSchema,
    removeConnectionSchema,
} from "../validators/connection.validator.js";

const router = Router();

// All connection routes require authentication
router.use(authenticate);

// ── Read ──────────────────────────────────────────────────────────────────
router.get("/", getMyConnections);
router.get("/requests", getIncomingRequests);
router.get("/sent", getOutgoingRequests);

// ── Write ─────────────────────────────────────────────────────────────────
router.post("/request/:userId", validate(sendRequestSchema), sendRequest);
router.patch("/accept/:requestId", validate(acceptRequestSchema), acceptRequest);
router.patch("/reject/:requestId", validate(rejectRequestSchema), rejectRequest);

// ── Delete ────────────────────────────────────────────────────────────────
router.delete("/withdraw/:requestId", validate(withdrawRequestSchema), withdrawRequest);
router.delete("/remove/:userId", validate(removeConnectionSchema), removeConnection);

export default router;
