import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { connectTestMongo, cleanupTestMongo } from "./setup.js";
import User from "../models/user.model.js";

describe("Auth Integration Tests", () => {
    beforeAll(async () => {
        await connectTestMongo();
    });

    afterAll(async () => {
        await cleanupTestMongo();
    });

    // (1) register with a mixed-case email, then login with the lowercase email succeeds
    it("registers with a mixed-case email and logs in with lowercase email", async () => {
        const regRes = await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Mixed Case User",
                username: "mixedcaseuser",
                email: "MixedCase_User@Example.COM",
                password: "password123456",
            });
        expect([200, 201]).toContain(regRes.status);
        expect(regRes.body.success).toBe(true);

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "mixedcase_user@example.com",
                password: "password123456",
            });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
        expect(loginRes.body.data.user.email).toBe("mixedcase_user@example.com");
    });

    // (2) login with an unknown email returns 401 with the generic message, never 500
    it("returns 401 with generic message for unknown email", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "nonexistent_unknown_999@example.com",
                password: "wrongpassword123",
            });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Invalid email or password");
    });

    // (3) deactivated account: wrong password returns the generic message; correct password returns the deactivated message
    it("deactivated account: wrong password returns generic message; correct password returns deactivated message", async () => {
        const email = "deactivated_test_user@example.com";
        const password = "correctpassword123";

        // Register user
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Deactivated User",
                username: "deactuser",
                email,
                password,
            });

        // Deactivate directly in database
        await User.findOneAndUpdate({ email }, { active: false });

        // Wrong password -> generic message
        const wrongRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email,
                password: "wrongpassword999",
            });
        expect(wrongRes.status).toBe(401);
        expect(wrongRes.body.success).toBe(false);
        expect(wrongRes.body.message).toBe("Invalid email or password");

        // Correct password -> deactivated message
        const rightRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email,
                password,
            });
        expect(rightRes.status).toBe(401);
        expect(rightRes.body.success).toBe(false);
        expect(rightRes.body.message).toMatch(/deactivated/i);
    });

    // (4) after self-deactivation the OLD cookie returns 401 on GET /users/<id>
    it("after self-deactivation the OLD cookie returns 401 on GET /users/<id>", async () => {
        const email = "self_deact_user@example.com";
        const password = "password123456";

        // Register
        await request(app)
            .post("/api/v1/auth/register")
            .send({
                name: "Self Deact",
                username: "selfdeact",
                email,
                password,
            });

        // Login and obtain cookie
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password });
        expect(loginRes.status).toBe(200);

        const cookie = loginRes.headers["set-cookie"];
        const userId = loginRes.body.data.user._id;

        // Deactivate account via DELETE /users/:id
        const delRes = await request(app)
            .delete(`/api/v1/users/${userId}`)
            .set("Cookie", cookie);
        expect(delRes.status).toBe(200);

        // GET /users/:id with OLD cookie must now fail with 401
        const getRes = await request(app)
            .get(`/api/v1/users/${userId}`)
            .set("Cookie", cookie);
        expect(getRes.status).toBe(401);
        expect(getRes.body.success).toBe(false);
    });
});
