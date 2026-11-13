// Set DEBUG_IP_ENDPOINT to true BEFORE importing app.js
process.env.DEBUG_IP_ENDPOINT = "true";

import { describe, it, expect } from "vitest";
import request from "supertest";

// Dynamic import ensures process.env.DEBUG_IP_ENDPOINT is read by config/env.js and app.js
const { app } = await import("../app.js");

describe("Debug IP Endpoint (Enabled)", () => {
    it("GET /api/v1/debug/ip returns 200 with ip, xForwardedFor, and trustProxy", async () => {
        const res = await request(app)
            .get("/api/v1/debug/ip")
            .set("X-Forwarded-For", "203.0.113.195");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("ip");
        expect(res.body.xForwardedFor).toBe("203.0.113.195");
        expect(res.body).toHaveProperty("trustProxy");
    });
});
