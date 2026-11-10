import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { connectTestMongo, cleanupTestMongo, flushTestRedis } from "./setup.js";

let ipCounter = 100;
const nextIp = () => `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

describe("Phase 5.1a Profile Data and Search Integration Tests", () => {
    let userAId;
    let cookieA;
    let userBId;
    let cookieB;

    beforeAll(async () => {
        await connectTestMongo();
        await flushTestRedis();

        // Register and login User A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Alice Original",
                username: "aliceprofile",
                email: "alice_profile@example.com",
                password: "password123456",
            });
        userAId = regA.body.data._id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "alice_profile@example.com", password: "password123456" });
        cookieA = loginA.headers["set-cookie"];

        // Register and login User B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Bob Reader",
                username: "bobprofile",
                email: "bob_profile@example.com",
                password: "password123456",
            });
        userBId = regB.body.data._id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .set("X-Forwarded-For", nextIp())
            .send({ email: "bob_profile@example.com", password: "password123456" });
        cookieB = loginB.headers["set-cookie"];
    });

    afterAll(async () => {
        await cleanupTestMongo();
    });

    it("valid full profile update returns 200 and GET returns it", async () => {
        const fullProfile = {
            headline: "Senior Software Engineer",
            about: "Experienced full stack engineer who loves TypeScript and Node.",
            location: "San Francisco, CA",
            skills: ["JavaScript", "TypeScript", "React", "Node.js"],
            experience: [
                {
                    title: "Lead Developer",
                    company: "Acme Corp",
                    startDate: "2021-06",
                    endDate: null,
                    current: true,
                    description: "Leading the core platform team.",
                },
                {
                    title: "Software Engineer",
                    company: "Tech Start",
                    startDate: "2019-01",
                    endDate: "2021-05",
                    current: false,
                    description: "Built scalable backend services.",
                },
            ],
            education: [
                {
                    school: "University of Technology",
                    degree: "B.S.",
                    field: "Computer Science",
                    startYear: 2015,
                    endYear: 2019,
                },
            ],
        };

        const updateRes = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send(fullProfile);

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.success).toBe(true);
        expect(updateRes.body.data.headline).toBe(fullProfile.headline);
        expect(updateRes.body.data.about).toBe(fullProfile.about);
        expect(updateRes.body.data.location).toBe(fullProfile.location);
        expect(updateRes.body.data.skills).toEqual(fullProfile.skills);
        expect(updateRes.body.data.experience).toHaveLength(2);
        expect(updateRes.body.data.education).toHaveLength(1);

        const getRes = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA);

        expect(getRes.status).toBe(200);
        expect(getRes.body.data.headline).toBe(fullProfile.headline);
        expect(getRes.body.data.about).toBe(fullProfile.about);
        expect(getRes.body.data.location).toBe(fullProfile.location);
        expect(getRes.body.data.skills).toEqual(fullProfile.skills);
        expect(getRes.body.data.experience).toHaveLength(2);
        expect(getRes.body.data.education).toHaveLength(1);
    });

    it("unknown key 400", async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({ unknownKey: "unexpected_value" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("headline of 121 chars 400", async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({ headline: "a".repeat(121) });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("21 skills 400", async () => {
        const skills21 = Array.from({ length: 21 }, (_, i) => `skill${i}`);
        const res = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({ skills: skills21 });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("11 experience entries 400", async () => {
        const exp11 = Array.from({ length: 11 }, (_, i) => ({
            title: `Role ${i}`,
            company: `Company ${i}`,
            startDate: "2020-01",
            endDate: null,
            current: true,
        }));

        const res = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({ experience: exp11 });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("current:true with an endDate 400", async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({
                experience: [
                    {
                        title: "Role",
                        company: "Company",
                        startDate: "2020-01",
                        endDate: "2022-01",
                        current: true,
                    },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("endDate before startDate 400", async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({
                experience: [
                    {
                        title: "Role",
                        company: "Company",
                        startDate: "2022-01",
                        endDate: "2020-01",
                        current: false,
                    },
                ],
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("name update 200", async () => {
        const res = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({ name: "Alice Updated" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe("Alice Updated");

        const getRes = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA);

        expect(getRes.status).toBe(200);
        expect(getRes.body.data.name).toBe("Alice Updated");
    });

    it("another user's GET has headline and skills but no email", async () => {
        const res = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieB);

        expect(res.status).toBe(200);
        expect(res.body.data.headline).toBe("Senior Software Engineer");
        expect(res.body.data.skills).toEqual(["JavaScript", "TypeScript", "React", "Node.js"]);
        expect(res.body.data.email).toBeUndefined();
    });

    it("feed, post, comment and likes responses include author name and headline", async () => {
        // User A creates a post
        const postRes = await request(app)
            .post("/api/v1/posts")
            .set("Cookie", cookieA)
            .field("body", "Hello world from Alice with headline!");

        expect(postRes.status).toBe(201);
        const postId = postRes.body.data._id;

        // Verify post response has author name and headline
        const getPostRes = await request(app)
            .get(`/api/v1/posts/${postId}`)
            .set("Cookie", cookieA);

        expect(getPostRes.status).toBe(200);
        expect(getPostRes.body.data.authorId.name).toBe("Alice Updated");
        expect(getPostRes.body.data.authorId.headline).toBe("Senior Software Engineer");

        // User A likes the post
        const likeRes = await request(app)
            .post(`/api/v1/posts/${postId}/like`)
            .set("Cookie", cookieA);
        expect(likeRes.status).toBe(200);

        // Verify likes response includes author name and headline
        const getLikesRes = await request(app)
            .get(`/api/v1/posts/${postId}/likes`)
            .set("Cookie", cookieA);

        expect(getLikesRes.status).toBe(200);
        expect(getLikesRes.body.data.users).toHaveLength(1);
        expect(getLikesRes.body.data.users[0].name).toBe("Alice Updated");
        expect(getLikesRes.body.data.users[0].headline).toBe("Senior Software Engineer");

        // User A comments on the post
        const commentRes = await request(app)
            .post(`/api/v1/posts/${postId}/comments`)
            .set("Cookie", cookieA)
            .send({ body: "Alice's insightful comment" });
        expect(commentRes.status).toBe(201);

        // Verify comment list includes author name and headline
        const getCommentsRes = await request(app)
            .get(`/api/v1/posts/${postId}/comments`)
            .set("Cookie", cookieA);

        expect(getCommentsRes.status).toBe(200);
        expect(getCommentsRes.body.data.comments).toHaveLength(1);
        expect(getCommentsRes.body.data.comments[0].authorId.name).toBe("Alice Updated");
        expect(getCommentsRes.body.data.comments[0].authorId.headline).toBe("Senior Software Engineer");

        // Verify feed includes author name and headline (User A sees own post in feed)
        const feedRes = await request(app)
            .get("/api/v1/feed")
            .set("Cookie", cookieA);

        expect(feedRes.status).toBe(200);
        const feedPost = feedRes.body.data.posts.find((p) => p._id === postId);
        expect(feedPost).toBeDefined();
        expect(feedPost.authorId.name).toBe("Alice Updated");
        expect(feedPost.authorId.headline).toBe("Senior Software Engineer");
    });

    it("search with 1 char 400", async () => {
        const res = await request(app)
            .get("/api/v1/users/search?q=a")
            .set("Cookie", cookieA);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("prefix-first ordering (seed users 'eve' and 'steve'; q=ev returns eve before steve)", async () => {
        // Seed user "eve"
        await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Eve Prefix",
                username: "eve_search",
                email: "eve_search@example.com",
                password: "password123456",
            });

        // Seed user "steve"
        await request(app)
            .post("/api/v1/auth/register")
            .set("X-Forwarded-For", nextIp())
            .send({
                name: "Steve Contains",
                username: "steve_search",
                email: "steve_search@example.com",
                password: "password123456",
            });

        const res = await request(app)
            .get("/api/v1/users/search?q=ev")
            .set("Cookie", cookieA);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const usernames = res.body.data.users.map((u) => u.username);
        const eveIndex = usernames.indexOf("eve_search");
        const steveIndex = usernames.indexOf("steve_search");

        expect(eveIndex).toBeGreaterThanOrEqual(0);
        expect(steveIndex).toBeGreaterThanOrEqual(0);
        expect(eveIndex).toBeLessThan(steveIndex);
    });

    it("search results contain no about/experience/education keys", async () => {
        const res = await request(app)
            .get("/api/v1/users/search?q=alice")
            .set("Cookie", cookieA);

        expect(res.status).toBe(200);
        expect(res.body.data.users.length).toBeGreaterThan(0);

        for (const user of res.body.data.users) {
            expect(user.about).toBeUndefined();
            expect(user.experience).toBeUndefined();
            expect(user.education).toBeUndefined();
        }
    });

    it("update then GET returns the new data (cache invalidation)", async () => {
        // GET user to populate cache
        const firstGet = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA);
        expect(firstGet.status).toBe(200);
        expect(firstGet.body.data.headline).toBe("Senior Software Engineer");

        // Update headline
        const updateRes = await request(app)
            .patch(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA)
            .send({ headline: "Staff Software Engineer" });
        expect(updateRes.status).toBe(200);

        // GET user again to confirm fresh data returned from cache invalidation
        const secondGet = await request(app)
            .get(`/api/v1/users/${userAId}`)
            .set("Cookie", cookieA);
        expect(secondGet.status).toBe(200);
        expect(secondGet.body.data.headline).toBe("Staff Software Engineer");
    });
});
