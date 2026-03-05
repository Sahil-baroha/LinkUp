import dns from 'node:dns';
// Force usage of Google DNS for this Node process
dns.setServers(['8.8.8.8', '8.8.4.4']);

import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
// import postRoutes from "./routes/post.routes.js";
dotenv.config();
const Murl = process.env.MONGO_URL;
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// app.use("/api/v1/users", postRoutes);
app.use("/api/v1/users", userRoutes);

// Global Error Handler
import { errorHandler } from "./middleware/error-handler.middleware.js";
app.use(errorHandler);

const start = async () => {
    try {
        await mongoose.connect(Murl, {
            family: 4 // Force IPv4 (common fix for newer Node versions)
        });
        console.log("DB Connected Successfully!");
    } catch (err) {
        console.error("Critical Mongo Error:", err.message);
        // This will tell us if it's still a DNS issue or something else like Auth
    }
}

start();

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));