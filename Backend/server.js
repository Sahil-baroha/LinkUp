import { env } from "./config/env.js";

import dns from "node:dns";
if (env.DNS_SERVERS) {
    const servers = env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean);
    if (servers.length > 0) {
        dns.setServers(servers);
    }
}

import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import connectionRoutes from "./routes/connection.routes.js";
import postRoutes from "./routes/post.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { getCacheStatus, disconnectRedis } from "./utils/cache.js";

const app = express();

// Trust proxy configuration
app.set("trust proxy", env.TRUST_PROXY);

// ── Security middleware ───────────────────────────────────────────────────────
// M2: Sets X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, etc.
app.use(helmet());

// M3: Restrict CORS to the configured frontend origin
app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
}));

// Core middleware
app.use(express.json());
app.use(cookieParser());

// ── Health and Readiness checks (mounted at root, unauthenticated) ───────────
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
    });
});

app.get("/ready", async (_req, res) => {
    let mongoStatus = "down";
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                const timer = setTimeout(() => reject(new Error("timeout")), 2000);
                timer.unref?.();
            });
            await Promise.race([
                mongoose.connection.db.admin().ping(),
                timeoutPromise,
            ]);
            mongoStatus = "up";
        } catch {
            mongoStatus = "down";
        }
    }

    const redisStatus = getCacheStatus();

    if (mongoStatus === "up") {
        return res.status(200).json({
            status: "ready",
            mongo: "up",
            redis: redisStatus,
        });
    }

    return res.status(503).json({
        status: "not_ready",
        mongo: "down",
        redis: redisStatus,
    });
});

// Routes
app.use("/api/v1/auth", authRoutes);               // Public  — register, login, logout
app.use("/api/v1/users", userRoutes);               // Protected — user management
app.use("/api/v1/connections", connectionRoutes);   // Protected — connections
app.use("/api/v1/posts", postRoutes);               // Protected — posts, likes, comments
app.use("/api/v1/feed", feedRoutes);                // Protected — connection feed

// Global error handler — must be last middleware
app.use(errorHandler);

let server = null;
let isShuttingDown = false;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`[Shutdown] Received ${signal}, starting graceful shutdown.`);

    // Force exit after 10 seconds if shutdown hangs
    const forceExitTimer = setTimeout(() => {
        console.error("[Shutdown] Graceful shutdown timed out after 10s. Forcing exit.");
        process.exit(1);
    }, 10000);
    forceExitTimer.unref?.();

    try {
        // Stage 1: Stop accepting new HTTP connections
        if (server) {
            console.log("[Shutdown] Stage 1: Closing HTTP server.");
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
            console.log("[Shutdown] Stage 1 complete: HTTP server closed.");
        }

        // Stage 2: Close Mongoose database connection
        console.log("[Shutdown] Stage 2: Closing MongoDB connection.");
        await mongoose.connection.close(false);
        console.log("[Shutdown] Stage 2 complete: MongoDB connection closed.");

        // Stage 3: Disconnect Redis cache if active
        console.log("[Shutdown] Stage 3: Disconnecting Redis cache.");
        await disconnectRedis();
        console.log("[Shutdown] Stage 3 complete: Redis cache disconnected.");

        // Stage 4: Exit process cleanly
        console.log("[Shutdown] Stage 4: Graceful shutdown complete. Exiting.");
        process.exit(0);
    } catch (err) {
        console.error("[Shutdown] Error during shutdown:", err.message);
        process.exit(1);
    }
};

process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));

// Database connection & Server Startup
const start = async () => {
    try {
        await mongoose.connect(env.MONGO_URL, {
            family: 4,   // Force IPv4
            serverSelectionTimeoutMS: 10000,
        });
        console.log("DB Connected Successfully!");

        server = app.listen(env.PORT, () => console.log(`Server started on port ${env.PORT}`));
        return server;
    } catch (err) {
        console.error("Critical Mongo Error:", err.message);
        process.exit(1);
    }
};

start();
