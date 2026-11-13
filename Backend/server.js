import { env } from "./config/env.js";
import mongoose from "mongoose";
import { app } from "./app.js";
import { disconnectRedis } from "./utils/cache.js";

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
            maxPoolSize: env.MONGO_MAX_POOL_SIZE,
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
