import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";

dotenv.config();

const Murl = process.env.MONGO_URL;
const PORT = process.env.PORT || 3000;

const app = express();

// Core middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRoutes);   // Public — register, login, logout
app.use("/api/v1/users", userRoutes);  // Protected — user management

// Global error handler — must be last middleware
app.use(errorHandler);

// Database connection
const start = async () => {
    try {
        await mongoose.connect(Murl, {
            family: 4   // Force IPv4
        });
        console.log("DB Connected Successfully!");
    } catch (err) {
        console.error("Critical Mongo Error:", err.message);
        process.exit(1);
    }
};

start();

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));