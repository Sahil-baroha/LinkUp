import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";

describe("Health and Debug Routes (Default Config)", () => {
    it("GET /api/v1/health returns 200 with ok status and uptime", async () => {
        const res = await request(app).get("/api/v1/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(typeof res.body.uptime).toBe("number");
    });

    it("GET /api/v1/debug/ip returns 404 by default when DEBUG_IP_ENDPOINT is false", async () => {
        const res = await request(app).get("/api/v1/debug/ip");
        expect(res.status).toBe(404);
    });
});
