import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { connectTestMongo, cleanupTestMongo, flushTestRedis } from "./setup.js";

describe("Rate Limiting Integration Tests", () => {
    beforeAll(async () => {
        await connectTestMongo();
    });

    afterAll(async () => {
        await cleanupTestMongo();
    });

    beforeEach(async () => {
        await flushTestRedis();
    });

    // (8) 20 failed logins with DISTINCT emails return 401, the 21st returns 429 with a Retry-After header
    it("authIp: 20 failed logins with distinct emails return 401; 21st returns 429 with Retry-After header", async () => {
        for (let i = 1; i <= 20; i++) {
            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: `distinct_user_${i}@example.com`,
                    password: "wrongpassword123",
                });
            expect(res.status).toBe(401);
        }

        const res21 = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "distinct_user_21@example.com",
                password: "wrongpassword123",
            });
        expect(res21.status).toBe(429);
        expect(res21.headers["retry-after"]).toBeDefined();
        expect(res21.body.message).toMatch(/too many requests/i);
    });

    // (9) 11th failed login for ONE email returns 429 while another account can still log in
    it("loginAccount: 11th failed login for one email returns 429 while another account can log in", async () => {
        // Register two accounts
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Account One",
                username: "accountone",
                email: "account_one@example.com",
                password: "correctpassword123",
            });

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Account Two",
                username: "accounttwo",
                email: "account_two@example.com",
                password: "correctpassword123",
            });

        // Flush redis to reset any authIp counts from registration
        await flushTestRedis();

        // 10 failed logins for account_one
        for (let i = 1; i <= 10; i++) {
            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({
                    email: "account_one@example.com",
                    password: "wrongpassword123",
                });
            expect(res.status).toBe(401);
        }

        // 11th failed login for account_one -> 429
        const res11 = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "account_one@example.com",
                password: "wrongpassword123",
            });
        expect(res11.status).toBe(429);

        // Account two login with correct credentials succeeds with 200
        const loginTwo = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "account_two@example.com",
                password: "correctpassword123",
            });
        expect(loginTwo.status).toBe(200);
        expect(loginTwo.body.success).toBe(true);
    });

    // (10) with TRUST_PROXY=1, exhaust login IP limit using X-Forwarded-For 203.0.113.1,
    //      then request with X-Forwarded-For 203.0.113.2 must NOT be 429
    it("trust proxy: X-Forwarded-For creates distinct IP buckets", async () => {
        // 20 requests from 203.0.113.1
        for (let i = 1; i <= 20; i++) {
            const res = await request(app)
                .post("/api/v1/auth/login")
                .set("X-Forwarded-For", "203.0.113.1")
                .send({
                    email: `client1_user_${i}@example.com`,
                    password: "wrongpassword123",
                });
            expect(res.status).toBe(401);
        }

        // 21st from 203.0.113.1 -> 429
        const blockedRes = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", "203.0.113.1")
            .send({
                email: "client1_user_21@example.com",
                password: "wrongpassword123",
            });
        expect(blockedRes.status).toBe(429);

        // Request from different client IP (203.0.113.2) must NOT be 429
        const otherClientRes = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", "203.0.113.2")
            .send({
                email: "client2_user@example.com",
                password: "wrongpassword123",
            });
        expect(otherClientRes.status).not.toBe(429);
        expect(otherClientRes.status).toBe(401);
    });

    // (11) 31st GET /users/search?q=ab returns 429
    it("searchLimiter: 31st GET /users/search returns 429", async () => {
        const email = "search_ratelimit_user@example.com";
        const password = "password123456";

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Search User",
                username: "searchuser1",
                email,
                password,
            });

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password });
        const cookie = loginRes.headers["set-cookie"];

        // 30 search requests return 200
        for (let i = 1; i <= 30; i++) {
            const res = await request(app)
                .get("/api/v1/users/search?q=ab")
                .set("Cookie", cookie);
            expect(res.status).toBe(200);
        }

        // 31st search request returns 429
        const res31 = await request(app)
            .get("/api/v1/users/search?q=ab")
            .set("Cookie", cookie);
        expect(res31.status).toBe(429);
    });

    // (12) 61st write request in a minute returns 429 (use likes or comment creation);
    //      21st POST /posts in the window returns 429
    it("writeLimiter and postCreateLimiter enforcement", async () => {
        const email = "write_limiter_user@example.com";
        const password = "password123456";

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Write User",
                username: "writeuser1",
                email,
                password,
            });

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password });
        const cookie = loginRes.headers["set-cookie"];

        // 1. postCreateLimiter: 20 POST /posts succeed, 21st returns 429
        let createdPostId = null;
        for (let i = 1; i <= 20; i++) {
            const res = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", cookie)
                .send({ body: `Post number ${i}` });
            expect([200, 201]).toContain(res.status);
            if (i === 1) createdPostId = res.body.data._id;
        }

        const post21 = await request(app)
            .post("/api/v1/posts")
            .set("Cookie", cookie)
            .send({ body: "Post number 21" });
        expect(post21.status).toBe(429);

        // 2. writeLimiter: 60 non-GET writes per minute.
        // Flush redis to test writeLimiter independently
        await flushTestRedis();

        // Perform 60 toggleLike write requests on the existing post
        for (let i = 1; i <= 60; i++) {
            const res = await request(app)
                .post(`/api/v1/posts/${createdPostId}/like`)
                .set("Cookie", cookie);
            expect(res.status).toBe(200);
        }

        // 61st write request returns 429
        const write61 = await request(app)
            .post(`/api/v1/posts/${createdPostId}/like`)
            .set("Cookie", cookie);
        expect(write61.status).toBe(429);
    });
});
