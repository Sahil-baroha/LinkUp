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

// Routes
app.use("/api/v1/auth", authRoutes);               // Public  — register, login, logout
app.use("/api/v1/users", userRoutes);               // Protected — user management
app.use("/api/v1/connections", connectionRoutes);   // Protected — connections
app.use("/api/v1/posts", postRoutes);               // Protected — posts, likes, comments
app.use("/api/v1/feed", feedRoutes);                // Protected — connection feed

// Global error handler — must be last middleware
app.use(errorHandler);

// Database connection & Server Startup
const start = async () => {
    try {
        await mongoose.connect(env.MONGO_URL, {
            family: 4,   // Force IPv4
            serverSelectionTimeoutMS: 10000,
        });
        console.log("DB Connected Successfully!");

        const server = app.listen(env.PORT, () => console.log(`Server started on port ${env.PORT}`));
        return server;
    } catch (err) {
        console.error("Critical Mongo Error:", err.message);
        process.exit(1);
    }
};

start();
