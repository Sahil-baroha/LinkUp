import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";



dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/linkup");

app.listen(3000, () => console.log("Server started on port 3000"));