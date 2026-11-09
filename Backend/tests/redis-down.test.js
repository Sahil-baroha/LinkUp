// Set REDIS_URL to an unreachable port BEFORE importing app.js
process.env.REDIS_URL = "redis://127.0.0.1:6390";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { connectTestMongo, cleanupTestMongo } from "./setup.js";

// Dynamic import ensures process.env.REDIS_URL is set before app.js and config/env.js load
const { app } = await import("../app.js");

describe("Redis-Down Integration Tests (Memory Fallback)", () => {
    beforeAll(async () => {
        await connectTestMongo();
    });

    afterAll(async () => {
        await cleanupTestMongo();
    });

    // (15) GET /users/<id> returns 200, /ready reports redis "down", and 31st search returns 429
    it("operates gracefully when Redis is down: /ready reports down, users fetched via DB, search rate limiter falls back to memory", async () => {
        // 1. Verify /ready reports redis as "down"
        const readyRes = await request(app).get("/ready");
        expect(readyRes.status).toBe(200);
        expect(readyRes.body.mongo).toBe("up");
        expect(readyRes.body.redis).toBe("down");

        // 2. Register and login
        const email = "redis_down_user@example.com";
        const password = "password123456";

        const regRes = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Redis Down User",
                username: "redisdownuser",
                email,
                password,
            });
        expect([200, 201]).toContain(regRes.status);
        const userId = regRes.body.data._id;

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password });
        expect(loginRes.status).toBe(200);
        const cookie = loginRes.headers["set-cookie"];

        // 3. GET /users/<id> returns 200 (direct DB hit, ignores Redis failure)
        const userRes = await request(app)
            .get(`/api/v1/users/${userId}`)
            .set("Cookie", cookie);
        expect(userRes.status).toBe(200);
        expect(userRes.body.data._id).toBe(userId);

        // 4. Memory fallback: 30 search requests return 200, 31st returns 429
        for (let i = 1; i <= 30; i++) {
            const res = await request(app)
                .get("/api/v1/users/search?q=ab")
                .set("Cookie", cookie);
            expect(res.status).toBe(200);
        }

        const res31 = await request(app)
            .get("/api/v1/users/search?q=ab")
            .set("Cookie", cookie);
        expect(res31.status).toBe(429);
    });
});
