import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { connectTestMongo, cleanupTestMongo } from "./setup.js";
import User from "../models/user.model.js";

describe("Users Integration Tests", () => {
    beforeAll(async () => {
        await connectTestMongo();
    });

    afterAll(async () => {
        await cleanupTestMongo();
    });

    // (5) Part A: PATCH {username: "newname"} returns 200
    it("PATCH own profile: allows valid username update", async () => {
        const email = "patch_valid_user@example.com";
        const password = "password123456";

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Patch Valid User",
                username: "patchvaliduser",
                email,
                password,
            });

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password });
        const cookie = loginRes.headers["set-cookie"];
        const userId = loginRes.body.data.user._id;

        const patchValidRes = await request(app)
            .patch(`/api/v1/users/${userId}`)
            .set("Cookie", cookie)
            .send({ username: "patchnewname" });
        expect(patchValidRes.status).toBe(200);
        expect(patchValidRes.body.data.username).toBe("patchnewname");
    });

    // (5) Part B: PATCH own profile with {active:false} and {"$set":{"active":false}} returns 4xx
    it("PATCH own profile: rejects illegal field updates with 4xx and user stays active", async () => {
        const email = "patch_illegal_user@example.com";
        const password = "password123456";

        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Patch Illegal User",
                username: "patchillegaluser",
                email,
                password,
            });

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password });
        const cookie = loginRes.headers["set-cookie"];
        const userId = loginRes.body.data.user._id;

        // PATCH with {active: false}
        const patchActiveRes = await request(app)
            .patch(`/api/v1/users/${userId}`)
            .set("Cookie", cookie)
            .send({ active: false });
        expect(patchActiveRes.status).toBe(400);
        expect(patchActiveRes.body.success).toBe(false);
        expect(typeof patchActiveRes.body.message).toBe("string");
        expect(patchActiveRes.body.message.length).toBeGreaterThan(0);

        // Verify user is still active in database
        const dbUser = await User.findById(userId);
        expect(dbUser.active).toBe(true);

        // PATCH with {"$set": {"active": false}}
        const patchInjectionRes = await request(app)
            .patch(`/api/v1/users/${userId}`)
            .set("Cookie", cookie)
            .send({ $set: { active: false } });
        expect(patchInjectionRes.status).toBe(400);
        expect(patchInjectionRes.body.success).toBe(false);
        expect(typeof patchInjectionRes.body.message).toBe("string");
        expect(patchInjectionRes.body.message.length).toBeGreaterThan(0);
    });

    // (6) GET another user's profile has no email field; own profile has email
    it("GET profile: own profile contains email; other user profile excludes email", async () => {
        // Register User A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "User Alpha",
                username: "useralpha",
                email: "useralpha@example.com",
                password: "password123456",
            });
        const userAId = regA.body.data._id;

        // Register User B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "User Beta",
                username: "userbeta",
                email: "userbeta@example.com",
                password: "password123456",
            });
        const userBId = regB.body.data._id;

        // Login as User A
        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "useralpha@example.com", password: "password123456" });
        const cookieA = loginA.headers["set-cookie"];

        // GET own profile (User A) -> email present
        const ownRes = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA);
        expect(ownRes.status).toBe(200);
        expect(ownRes.body.data.email).toBe("useralpha@example.com");

        // GET other user's profile (User B) -> email absent
        const otherRes = await request(app)
            .get(`/api/v1/users/${userBId}`)
            .set("Cookie", cookieA);
        expect(otherRes.status).toBe(200);
        expect(otherRes.body.data.email).toBeUndefined();
    });

    // (7) Part A: search q=( , q=.* , q=[ each return 200
    it("Search: regex metacharacters return 200", async () => {
        // Login as User A
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "useralpha@example.com", password: "password123456" });
        const cookie = loginRes.headers["set-cookie"];

        // q = (
        const res1 = await request(app)
            .get("/api/v1/users/search?q=(")
            .set("Cookie", cookie);
        expect(res1.status).toBe(200);

        // q = .*
        const res2 = await request(app)
            .get("/api/v1/users/search?q=.*")
            .set("Cookie", cookie);
        expect(res2.status).toBe(200);

        // q = [
        const res3 = await request(app)
            .get("/api/v1/users/search?q=[")
            .set("Cookie", cookie);
        expect(res3.status).toBe(200);
    });

    // (7) Part B: a 51-char q returns 4xx
    it("Search: 51-character query returns 4xx", async () => {
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "useralpha@example.com", password: "password123456" });
        const cookie = loginRes.headers["set-cookie"];

        const longQ = "a".repeat(51);
        const res4 = await request(app)
            .get(`/api/v1/users/search?q=${longQ}`)
            .set("Cookie", cookie);
        expect(res4.status).toBe(400);
        expect(res4.body.success).toBe(false);
        expect(typeof res4.body.message).toBe("string");
        expect(res4.body.message.length).toBeGreaterThan(0);
    });
});
