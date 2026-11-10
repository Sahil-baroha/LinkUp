import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import Redis from "ioredis";
import { app } from "../app.js";
import { connectTestMongo, cleanupTestMongo, flushTestRedis } from "./setup.js";
import User from "../models/user.model.js";

let ipCounter = 200;
const nextIp = () => `10.2.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

describe("Phase 5.1b Connection Status and Suggestions Integration Tests", () => {
    let redisClient;

    beforeAll(async () => {
        await connectTestMongo();
        await flushTestRedis();
        redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379/1");
    });

    afterAll(async () => {
        if (redisClient) {
            redisClient.disconnect();
        }
        await cleanupTestMongo();
    });

    it("all four states plus rejected-to-none, seen from BOTH sides; own profile has no connection", async () => {
        // Register User A and User B
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "User Status A",
                username: "status_a",
                email: "status_a@example.com",
                password: "password123456",
            });
        const userAId = regA.body.data._id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "status_a@example.com", password: "password123456" });
        const cookieA = loginA.headers["set-cookie"];

        const regB = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "User Status B",
                username: "status_b",
                email: "status_b@example.com",
                password: "password123456",
            });
        const userBId = regB.body.data._id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "status_b@example.com", password: "password123456" });
        const cookieB = loginB.headers["set-cookie"];

        // 1. Own profile: connection is omitted
        const ownResA = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA);
        expect(ownResA.status).toBe(200);
        expect(ownResA.body.data.connection).toBeUndefined();

        const ownResB = await request(app)
            .get(`/api/v1/users/${userBId}`)
            .set("Cookie", cookieB);
        expect(ownResB.status).toBe(200);
        expect(ownResB.body.data.connection).toBeUndefined();

        // 2. State "none"
        const noneResA = await request(app)
            .get(`/api/v1/users/${userBId}`)
            .set("Cookie", cookieA);
        expect(noneResA.status).toBe(200);
        expect(noneResA.body.data.connection).toEqual({ status: "none", requestId: null });

        const noneResB = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieB);
        expect(noneResB.status).toBe(200);
        expect(noneResB.body.data.connection).toEqual({ status: "none", requestId: null });

        // 3. State "pending_sent" (A) and "pending_received" (B) with matching requestId
        const sendReqRes = await request(app)
            .post(`/api/v1/connections/request/${userBId}`)
            .set("Cookie", cookieA);
        expect(sendReqRes.status).toBe(201);
        const requestId = sendReqRes.body.data._id;

        const pendingResA = await request(app)
            .get(`/api/v1/users/${userBId}`)
            .set("Cookie", cookieA);
        expect(pendingResA.status).toBe(200);
        expect(pendingResA.body.data.connection).toEqual({
            status: "pending_sent",
            requestId: String(requestId),
        });

        const pendingResB = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieB);
        expect(pendingResB.status).toBe(200);
        expect(pendingResB.body.data.connection).toEqual({
            status: "pending_received",
            requestId: String(requestId),
        });

        // 4. State "connected"
        const acceptRes = await request(app)
            .patch(`/api/v1/connections/accept/${requestId}`)
            .set("Cookie", cookieB);
        expect(acceptRes.status).toBe(200);

        const connectedResA = await request(app)
            .get(`/api/v1/users/${userBId}`)
            .set("Cookie", cookieA);
        expect(connectedResA.status).toBe(200);
        expect(connectedResA.body.data.connection).toEqual({
            status: "connected",
            requestId: String(requestId),
        });

        const connectedResB = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieB);
        expect(connectedResB.status).toBe(200);
        expect(connectedResB.body.data.connection).toEqual({
            status: "connected",
            requestId: String(requestId),
        });

        // 5. State "rejected" maps to "none" with requestId: null
        const regC = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "User Status C",
                username: "status_c",
                email: "status_c@example.com",
                password: "password123456",
            });
        const userCId = regC.body.data._id;

        const loginC = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "status_c@example.com", password: "password123456" });
        const cookieC = loginC.headers["set-cookie"];

        const regD = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "User Status D",
                username: "status_d",
                email: "status_d@example.com",
                password: "password123456",
            });
        const userDId = regD.body.data._id;

        const loginD = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "status_d@example.com", password: "password123456" });
        const cookieD = loginD.headers["set-cookie"];

        const sendReqCD = await request(app)
            .post(`/api/v1/connections/request/${userDId}`)
            .set("Cookie", cookieC);
        expect(sendReqCD.status).toBe(201);
        const reqCDId = sendReqCD.body.data._id;

        const rejectCD = await request(app)
            .patch(`/api/v1/connections/reject/${reqCDId}`)
            .set("Cookie", cookieD);
        expect(rejectCD.status).toBe(200);

        const rejectedResC = await request(app)
            .get(`/api/v1/users/${userDId}`)
            .set("Cookie", cookieC);
        expect(rejectedResC.status).toBe(200);
        expect(rejectedResC.body.data.connection).toEqual({
            status: "none",
            requestId: null,
        });

        const rejectedResD = await request(app)
            .get(`/api/v1/users/${userCId}`)
            .set("Cookie", cookieD);
        expect(rejectedResD.status).toBe(200);
        expect(rejectedResD.body.data.connection).toEqual({
            status: "none",
            requestId: null,
        });
    });

    it("search results carry correct connection", async () => {
        // Register searcher S
        const regS = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Searcher S",
                username: "searcher_s",
                email: "searcher_s@example.com",
                password: "password123456",
            });
        const userSId = regS.body.data._id;
        const loginS = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "searcher_s@example.com", password: "password123456" });
        const cookieS = loginS.headers["set-cookie"];

        // Register Target 1 and Target 2
        const regT1 = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "SearchTarget Alpha",
                username: "search_target_1",
                email: "search_target_1@example.com",
                password: "password123456",
            });
        const userT1Id = regT1.body.data._id;

        const regT2 = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "SearchTarget Beta",
                username: "search_target_2",
                email: "search_target_2@example.com",
                password: "password123456",
            });
        const userT2Id = regT2.body.data._id;

        // Connect S with T1
        const sendReq = await request(app)
            .post(`/api/v1/connections/request/${userT1Id}`)
            .set("Cookie", cookieS);
        const reqId = sendReq.body.data._id;

        const loginT1 = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "search_target_1@example.com", password: "password123456" });
        const cookieT1 = loginT1.headers["set-cookie"];

        await request(app)
            .patch(`/api/v1/connections/accept/${reqId}`)
            .set("Cookie", cookieT1);

        // S searches for "SearchTarget"
        const searchRes = await request(app)
            .get("/api/v1/users/search?q=SearchTarget")
            .set("Cookie", cookieS);

        expect(searchRes.status).toBe(200);
        expect(searchRes.body.data.users.length).toBeGreaterThanOrEqual(2);

        const target1 = searchRes.body.data.users.find(u => u._id === userT1Id);
        const target2 = searchRes.body.data.users.find(u => u._id === userT2Id);

        expect(target1).toBeDefined();
        expect(target1.connection).toEqual({
            status: "connected",
            requestId: String(reqId),
        });

        expect(target2).toBeDefined();
        expect(target2.connection).toEqual({
            status: "none",
            requestId: null,
        });
    });

    it("suggestions exclude self/connected/pending/rejected/inactive", async () => {
        // User Main
        const regMain = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Main User",
                username: "main_user_sug",
                email: "main_user_sug@example.com",
                password: "password123456",
            });
        const mainId = regMain.body.data._id;
        const loginMain = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "main_user_sug@example.com", password: "password123456" });
        const cookieMain = loginMain.headers["set-cookie"];

        // 1. Connected user
        const regConn = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Conn User",
                username: "conn_user_sug",
                email: "conn_user_sug@example.com",
                password: "password123456",
            });
        const connId = regConn.body.data._id;
        const reqConn = await request(app)
            .post(`/api/v1/connections/request/${connId}`)
            .set("Cookie", cookieMain);
        const loginConn = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "conn_user_sug@example.com", password: "password123456" });
        await request(app)
            .patch(`/api/v1/connections/accept/${reqConn.body.data._id}`)
            .set("Cookie", loginConn.headers["set-cookie"]);

        // 2. Pending sent user
        const regPendingSent = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Pending Sent",
                username: "pending_sent_sug",
                email: "pending_sent_sug@example.com",
                password: "password123456",
            });
        const pendingSentId = regPendingSent.body.data._id;
        await request(app)
            .post(`/api/v1/connections/request/${pendingSentId}`)
            .set("Cookie", cookieMain);

        // 3. Pending received user
        const regPendingRecv = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Pending Recv",
                username: "pending_recv_sug",
                email: "pending_recv_sug@example.com",
                password: "password123456",
            });
        const pendingRecvId = regPendingRecv.body.data._id;
        const loginPendingRecv = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "pending_recv_sug@example.com", password: "password123456" });
        await request(app)
            .post(`/api/v1/connections/request/${mainId}`)
            .set("Cookie", loginPendingRecv.headers["set-cookie"]);

        // 4. Rejected user
        const regRejected = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Rejected User",
                username: "rejected_user_sug",
                email: "rejected_user_sug@example.com",
                password: "password123456",
            });
        const rejectedId = regRejected.body.data._id;
        const reqRej = await request(app)
            .post(`/api/v1/connections/request/${rejectedId}`)
            .set("Cookie", cookieMain);
        const loginRej = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "rejected_user_sug@example.com", password: "password123456" });
        await request(app)
            .patch(`/api/v1/connections/reject/${reqRej.body.data._id}`)
            .set("Cookie", loginRej.headers["set-cookie"]);

        // 5. Inactive user
        const regInactive = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Inactive User",
                username: "inactive_user_sug",
                email: "inactive_user_sug@example.com",
                password: "password123456",
            });
        const inactiveId = regInactive.body.data._id;
        await User.findByIdAndUpdate(inactiveId, { active: false });

        // 6. Eligible user
        const regEligible = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Eligible User",
                username: "eligible_user_sug",
                email: "eligible_user_sug@example.com",
                password: "password123456",
            });
        const eligibleId = regEligible.body.data._id;

        // Fetch suggestions
        const sugRes = await request(app)
            .get("/api/v1/users/suggestions?limit=10")
            .set("Cookie", cookieMain);

        expect(sugRes.status).toBe(200);
        expect(Array.isArray(sugRes.body.data)).toBe(true);

        const returnedIds = sugRes.body.data.map(u => String(u._id));
        expect(returnedIds).not.toContain(String(mainId));
        expect(returnedIds).not.toContain(String(connId));
        expect(returnedIds).not.toContain(String(pendingSentId));
        expect(returnedIds).not.toContain(String(pendingRecvId));
        expect(returnedIds).not.toContain(String(rejectedId));
        expect(returnedIds).not.toContain(String(inactiveId));
        expect(returnedIds).toContain(String(eligibleId));
    });

    it("friends-of-friends come first with the right mutualCount", async () => {
        // User X
        const regX = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "User X",
                username: "user_fof_x",
                email: "user_fof_x@example.com",
                password: "password123456",
            });
        const xId = regX.body.data._id;
        const loginX = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "user_fof_x@example.com", password: "password123456" });
        const cookieX = loginX.headers["set-cookie"];

        // Friends of X: F1 and F2
        const regF1 = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Friend One",
                username: "friend_one_fof",
                email: "friend_one_fof@example.com",
                password: "password123456",
            });
        const f1Id = regF1.body.data._id;
        const loginF1 = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "friend_one_fof@example.com", password: "password123456" });

        const regF2 = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Friend Two",
                username: "friend_two_fof",
                email: "friend_two_fof@example.com",
                password: "password123456",
            });
        const f2Id = regF2.body.data._id;
        const loginF2 = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "friend_two_fof@example.com", password: "password123456" });

        // Connect X <-> F1
        const r1 = await request(app).post(`/api/v1/connections/request/${f1Id}`).set("Cookie", cookieX);
        await request(app).patch(`/api/v1/connections/accept/${r1.body.data._id}`).set("Cookie", loginF1.headers["set-cookie"]);

        // Connect X <-> F2
        const r2 = await request(app).post(`/api/v1/connections/request/${f2Id}`).set("Cookie", cookieX);
        await request(app).patch(`/api/v1/connections/accept/${r2.body.data._id}`).set("Cookie", loginF2.headers["set-cookie"]);

        // Candidate 2Mutual (connected to F1 and F2)
        const reg2M = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Two Mutuals",
                username: "two_mutuals_fof",
                email: "two_mutuals_fof@example.com",
                password: "password123456",
            });
        const m2Id = reg2M.body.data._id;
        const login2M = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "two_mutuals_fof@example.com", password: "password123456" });

        const rf1m = await request(app).post(`/api/v1/connections/request/${m2Id}`).set("Cookie", loginF1.headers["set-cookie"]);
        await request(app).patch(`/api/v1/connections/accept/${rf1m.body.data._id}`).set("Cookie", login2M.headers["set-cookie"]);

        const rf2m = await request(app).post(`/api/v1/connections/request/${m2Id}`).set("Cookie", loginF2.headers["set-cookie"]);
        await request(app).patch(`/api/v1/connections/accept/${rf2m.body.data._id}`).set("Cookie", login2M.headers["set-cookie"]);

        // Candidate 1Mutual (connected to F1 only)
        const reg1M = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "One Mutual",
                username: "one_mutual_fof",
                email: "one_mutual_fof@example.com",
                password: "password123456",
            });
        const m1Id = reg1M.body.data._id;
        const login1M = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "one_mutual_fof@example.com", password: "password123456" });

        const rf1_1m = await request(app).post(`/api/v1/connections/request/${m1Id}`).set("Cookie", loginF1.headers["set-cookie"]);
        await request(app).patch(`/api/v1/connections/accept/${rf1_1m.body.data._id}`).set("Cookie", login1M.headers["set-cookie"]);

        // Fetch suggestions for X with limit=5
        const sugRes = await request(app)
            .get("/api/v1/users/suggestions?limit=5")
            .set("Cookie", cookieX);

        expect(sugRes.status).toBe(200);
        const data = sugRes.body.data;
        expect(data.length).toBeGreaterThanOrEqual(2);

        const user2M = data.find(u => String(u._id) === String(m2Id));
        const user1M = data.find(u => String(u._id) === String(m1Id));

        expect(user2M).toBeDefined();
        expect(user2M.mutualCount).toBe(2);
        expect(user2M.email).toBeUndefined();

        expect(user1M).toBeDefined();
        expect(user1M.mutualCount).toBe(1);
        expect(user1M.email).toBeUndefined();

        // 2Mutual appears before 1Mutual
        const idx2M = data.findIndex(u => String(u._id) === String(m2Id));
        const idx1M = data.findIndex(u => String(u._id) === String(m1Id));
        expect(idx2M).toBeLessThan(idx1M);
    });

    it("limit=11 returns 400", async () => {
        const reg = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Limit Test",
                username: "limit_test_sug",
                email: "limit_test_sug@example.com",
                password: "password123456",
            });
        const login = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "limit_test_sug@example.com", password: "password123456" });
        const cookie = login.headers["set-cookie"];

        const res = await request(app)
            .get("/api/v1/users/suggestions?limit=11")
            .set("Cookie", cookie);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("the cache key exists after the first call", async () => {
        const reg = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Cache Sug User",
                username: "cache_sug_user",
                email: "cache_sug_user@example.com",
                password: "password123456",
            });
        const userId = reg.body.data._id;
        const login = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "cache_sug_user@example.com", password: "password123456" });
        const cookie = login.headers["set-cookie"];

        // Clear any existing key
        await redisClient.del(`suggestions:${userId}:5`);

        // First call
        const res = await request(app)
            .get("/api/v1/users/suggestions?limit=5")
            .set("Cookie", cookie);
        expect(res.status).toBe(200);

        // Verify key exists in Redis
        const cached = await redisClient.get(`suggestions:${userId}:5`);
        expect(cached).not.toBeNull();
        const parsed = JSON.parse(cached);
        expect(Array.isArray(parsed)).toBe(true);
    });
});
