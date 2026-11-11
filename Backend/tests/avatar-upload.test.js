import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { connectTestMongo, cleanupTestMongo, flushTestRedis } from "./setup.js";
import User from "../models/user.model.js";

// Vi.mock utils/cloudinary.js
export const mockUploadToCloudinary = vi.fn();
export const mockDeleteFromCloudinary = vi.fn();

vi.mock("../utils/cloudinary.js", () => ({
    uploadToCloudinary: (...args) => mockUploadToCloudinary(...args),
    deleteFromCloudinary: (...args) => mockDeleteFromCloudinary(...args),
}));

// Real 1x1 PNG bytes in Base64 (valid magic bytes: 89 50 4E 47 0D 0A 1A 0A)
const VALID_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const validPngBuffer = Buffer.from(VALID_PNG_BASE64, "base64");

// Fake PNG: invalid bytes disguised with image/png mimetype
const invalidBytesBuffer = Buffer.from("Not a real PNG file header content");

// Over 5MB buffer (5MB = 5 * 1024 * 1024 = 5242880 bytes)
const overLimitBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5MB + 1KB

let ipCounter = 500;
const nextIp = () => `10.5.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

describe("Phase 5.1c Avatar Upload and Mocked Upload Tests", () => {
    let userAId;
    let cookieA;
    let userBId;
    let cookieB;

    beforeAll(async () => {
        await connectTestMongo();
        await flushTestRedis();

        // Register User A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Avatar User A",
                username: "avatar_user_a",
                email: "avatar_a@example.com",
                password: "password123456",
            });
        userAId = regA.body.data._id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "avatar_a@example.com", password: "password123456" });
        cookieA = loginA.headers["set-cookie"];

        // Register User B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Avatar User B",
                username: "avatar_user_b",
                email: "avatar_b@example.com",
                password: "password123456",
            });
        userBId = regB.body.data._id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "avatar_b@example.com", password: "password123456" });
        cookieB = loginB.headers["set-cookie"];
    });

    afterAll(async () => {
        await cleanupTestMongo();
    });

    describe("posts upload suite", () => {
        it("POST /posts with text + valid PNG returns 201 and stores the mocked URL", async () => {
            mockUploadToCloudinary.mockResolvedValueOnce({
                url: "https://res.cloudinary.com/demo/image/upload/v1234/linkup/posts/sample_post.png",
                publicId: "linkup/posts/sample_post",
            });

            const res = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .field("body", "Post with valid image")
                .attach("image", validPngBuffer, "test.png");

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.image.url).toBe("https://res.cloudinary.com/demo/image/upload/v1234/linkup/posts/sample_post.png");
            expect(mockUploadToCloudinary).toHaveBeenCalledTimes(1);
            expect(mockUploadToCloudinary).toHaveBeenCalledWith(
                expect.any(Buffer),
                "image/png",
                "linkup/posts"
            );
        });

        it("invalid bytes with an image mimetype is rejected (400)", async () => {
            const res = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .field("body", "Post with invalid bytes")
                .attach("image", invalidBytesBuffer, { filename: "test.png", contentType: "image/png" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/File content does not match declared type/);
        });

        it("a file over the size limit is rejected (400)", async () => {
            const res = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .field("body", "Post with oversized file")
                .attach("image", overLimitBuffer, "huge.png");

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe("Image must not exceed 5MB");
        });

        // Reviewer hypothesis tested: Multer emits LIMIT_UNEXPECTED_FILE which currently bubbles to 500
        it.fails("a wrong field name is handled (expected 4xx, returns 500 in current multer implementation)", async () => {
            const res = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .field("body", "Post with wrong field name")
                .attach("wrongField", validPngBuffer, "test.png");

            expect(res.status).toBe(400);
        });

        it("PATCH post with a new image calls the mock and the old-image deletion", async () => {
            // First create a post with an image
            mockUploadToCloudinary.mockResolvedValueOnce({
                url: "https://res.cloudinary.com/demo/image/upload/v1234/linkup/posts/old_post.png",
                publicId: "linkup/posts/old_post",
            });

            const createRes = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .field("body", "Post before patch")
                .attach("image", validPngBuffer, "old.png");

            expect(createRes.status).toBe(201);
            const postId = createRes.body.data._id;

            // Now patch with a new image
            mockDeleteFromCloudinary.mockResolvedValueOnce(true);
            mockUploadToCloudinary.mockResolvedValueOnce({
                url: "https://res.cloudinary.com/demo/image/upload/v1234/linkup/posts/new_post.png",
                publicId: "linkup/posts/new_post",
            });

            const patchRes = await request(app)
                .patch(`/api/v1/posts/${postId}`)
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .field("body", "Post after patch")
                .attach("image", validPngBuffer, "new.png");

            expect(patchRes.status).toBe(200);
            expect(patchRes.body.data.image.url).toBe("https://res.cloudinary.com/demo/image/upload/v1234/linkup/posts/new_post.png");
            expect(mockDeleteFromCloudinary).toHaveBeenCalledWith("linkup/posts/old_post");
        });

        it("a text-only post is unaffected (no Cloudinary call)", async () => {
            mockUploadToCloudinary.mockClear();

            const res = await request(app)
                .post("/api/v1/posts")
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .send({ body: "Just plain text without image" });

            expect(res.status).toBe(201);
            expect(res.body.data.image.url).toBeNull();
            expect(mockUploadToCloudinary).not.toHaveBeenCalled();
        });
    });

    describe("avatar upload suite", () => {
        it("valid PNG returns 200 and GET /users/:id shows the new URL; profilePicturePublicId never appears", async () => {
            mockUploadToCloudinary.mockResolvedValueOnce({
                url: "https://res.cloudinary.com/demo/image/upload/v1234/linkup/avatars/user_a_avatar1.png",
                publicId: "linkup/avatars/user_a_avatar1",
            });

            const putRes = await request(app)
                .put(`/api/v1/users/${userAId}/avatar`)
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .attach("avatar", validPngBuffer, "avatar1.png");

            expect(putRes.status).toBe(200);
            expect(putRes.body.success).toBe(true);
            expect(putRes.body.data.profilePicture).toBe("https://res.cloudinary.com/demo/image/upload/v1234/linkup/avatars/user_a_avatar1.png");
            expect(putRes.body.data.profilePicturePublicId).toBeUndefined();

            // Verify with GET /users/:id
            const getRes = await request(app)
                .get(`/api/v1/users/${userAId}`)
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp());

            expect(getRes.status).toBe(200);
            expect(getRes.body.data.profilePicture).toBe("https://res.cloudinary.com/demo/image/upload/v1234/linkup/avatars/user_a_avatar1.png");
            expect(getRes.body.data.profilePicturePublicId).toBeUndefined();

            // Also check from other user's view
            const getOtherRes = await request(app)
                .get(`/api/v1/users/${userAId}`)
                .set("Cookie", cookieB)
                .set("X-Forwarded-For", nextIp());

            expect(getOtherRes.status).toBe(200);
            expect(getOtherRes.body.data.profilePicture).toBe("https://res.cloudinary.com/demo/image/upload/v1234/linkup/avatars/user_a_avatar1.png");
            expect(getOtherRes.body.data.profilePicturePublicId).toBeUndefined();
        });

        it("a non-owner is rejected with 403 Forbidden", async () => {
            const res = await request(app)
                .put(`/api/v1/users/${userAId}/avatar`)
                .set("Cookie", cookieB) // User B trying to change User A's avatar
                .set("X-Forwarded-For", nextIp())
                .attach("avatar", validPngBuffer, "avatar.png");

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/only update your own profile/i);
        });

        it("a missing file returns 400 Bad Request", async () => {
            const res = await request(app)
                .put(`/api/v1/users/${userAId}/avatar`)
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .send({}); // No multipart avatar attached

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Avatar image file is required/i);
        });

        it("a second upload deletes the first asset", async () => {
            mockDeleteFromCloudinary.mockClear();
            mockDeleteFromCloudinary.mockResolvedValueOnce(true);
            mockUploadToCloudinary.mockResolvedValueOnce({
                url: "https://res.cloudinary.com/demo/image/upload/v1234/linkup/avatars/user_a_avatar2.png",
                publicId: "linkup/avatars/user_a_avatar2",
            });

            const res = await request(app)
                .put(`/api/v1/users/${userAId}/avatar`)
                .set("Cookie", cookieA)
                .set("X-Forwarded-For", nextIp())
                .attach("avatar", validPngBuffer, "avatar2.png");

            expect(res.status).toBe(200);
            expect(res.body.data.profilePicture).toBe("https://res.cloudinary.com/demo/image/upload/v1234/linkup/avatars/user_a_avatar2.png");
            expect(res.body.data.profilePicturePublicId).toBeUndefined();

            // Verify old asset was requested to be deleted
            expect(mockDeleteFromCloudinary).toHaveBeenCalledTimes(1);
            expect(mockDeleteFromCloudinary).toHaveBeenCalledWith("linkup/avatars/user_a_avatar1");
        });
    });
});
