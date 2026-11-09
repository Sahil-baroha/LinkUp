import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import Redis from "ioredis";
import { app } from "../app.js";
import { connectTestMongo, cleanupTestMongo, flushTestRedis } from "./setup.js";

describe("Cache and Feed Integration Tests", () => {
    let redisClient;

    beforeAll(async () => {
        await connectTestMongo();
        redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379/1");
    });

    afterAll(async () => {
        if (redisClient) {
            redisClient.disconnect();
        }
        await cleanupTestMongo();
    });

    beforeEach(async () => {
        await flushTestRedis();
    });

    // (13) after GET /users/<id>, the Redis key user:id:<id> exists and its JSON has no password field
    it("caches user by ID without password field", async () => {
        const regRes = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Cache User",
                username: "cacheuser1",
                email: "cache_user_test@example.com",
                password: "password123456",
            });
        const userId = regRes.body.data._id;

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "cache_user_test@example.com",
                password: "password123456",
            });
        const cookie = loginRes.headers["set-cookie"];

        // Call GET /users/<id>
        const getRes = await request(app)
            .get(`/api/v1/users/${userId}`)
            .set("Cookie", cookie);
        expect(getRes.status).toBe(200);

        // Inspect Redis key directly
        const rawCached = await redisClient.get(`user:id:${userId}`);
        expect(rawCached).not.toBeNull();

        const parsed = JSON.parse(rawCached);
        expect(parsed._id).toBe(userId);
        expect(parsed.password).toBeUndefined();
    });

    // (14) Part A: feed: a new user with zero connections sees their own post; with an accepted connection
    //      the connection's post appears; after removal it disappears
    it("feed: includes own posts, handles connection acceptance and removal", async () => {
        // Register User A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Feed User A",
                username: "feedusera",
                email: "feed_user_a@example.com",
                password: "password123456",
            });
        const userAId = regA.body.data._id;
        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "feed_user_a@example.com", password: "password123456" });
        const cookieA = loginA.headers["set-cookie"];

        // Register User B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Feed User B",
                username: "feeduserb",
                email: "feed_user_b@example.com",
                password: "password123456",
            });
        const userBId = regB.body.data._id;
        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "feed_user_b@example.com", password: "password123456" });
        const cookieB = loginB.headers["set-cookie"];

        // 1. User A creates a post (zero connections)
        const postARes = await request(app)
            .post("/api/v1/posts")
            .set("Cookie", cookieA)
            .send({ body: "User A solitary post" });
        const postAId = postARes.body.data._id;

        // User A GET /feed sees own post
        const feedA1 = await request(app)
            .get("/api/v1/feed")
            .set("Cookie", cookieA);
        expect(feedA1.status).toBe(200);
        const hasOwnPost = feedA1.body.data.posts.some((p) => p._id === postAId);
        expect(hasOwnPost).toBe(true);

        // 2. User B creates a post
        const postBRes = await request(app)
            .post("/api/v1/posts")
            .set("Cookie", cookieB)
            .send({ body: "User B connected post" });
        const postBId = postBRes.body.data._id;

        // Before connection, A does NOT see B's post
        const feedBeforeConn = await request(app)
            .get("/api/v1/feed")
            .set("Cookie", cookieA);
        expect(feedBeforeConn.body.data.posts.some((p) => p._id === postBId)).toBe(false);

        // Connect A and B: A sends request, B accepts
        const reqRes = await request(app)
            .post(`/api/v1/connections/request/${userBId}`)
            .set("Cookie", cookieA);
        const requestId = reqRes.body.data._id;

        const acceptRes = await request(app)
            .patch(`/api/v1/connections/accept/${requestId}`)
            .set("Cookie", cookieB);
        expect(acceptRes.status).toBe(200);

        // After accepting, A's feed immediately includes B's post
        const feedAfterConn = await request(app)
            .get("/api/v1/feed")
            .set("Cookie", cookieA);
        expect(feedAfterConn.status).toBe(200);
        expect(feedAfterConn.body.data.posts.some((p) => p._id === postBId)).toBe(true);

        // 3. Remove connection: B removes A
        const removeRes = await request(app)
            .delete(`/api/v1/connections/remove/${userAId}`)
            .set("Cookie", cookieB);
        expect(removeRes.status).toBe(200);

        // After removal, B's post disappears from A's feed
        const feedAfterRemoval = await request(app)
            .get("/api/v1/feed")
            .set("Cookie", cookieA);
        expect(feedAfterRemoval.status).toBe(200);
        expect(feedAfterRemoval.body.data.posts.some((p) => p._id === postBId)).toBe(false);
    });

    // (14) Part B: GET /feed with an invalid cursor string returns 4xx, not 500
    it("feed: GET /feed with invalid cursor string returns 4xx, not 500", async () => {
        // Register & login User
        const reg = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Cursor User",
                username: "cursoruser",
                email: "cursor_user@example.com",
                password: "password123456",
            });
        const login = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "cursor_user@example.com", password: "password123456" });
        const cookie = login.headers["set-cookie"];

        // Invalid cursor string returns 400
        const invalidCursorRes = await request(app)
            .get("/api/v1/feed?cursor=not-a-valid-datetime")
            .set("Cookie", cookie);
        expect(invalidCursorRes.status).toBe(400);
        expect(invalidCursorRes.body.success).toBe(false);
        expect(typeof invalidCursorRes.body.message).toBe("string");
        expect(invalidCursorRes.body.message.length).toBeGreaterThan(0);
    });
});
