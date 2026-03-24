import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    }
}, { timestamps: true });

// Prevent duplicate requests between the same pair
connectionSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

// Feed query index: filter accepted connections by participant efficiently
connectionSchema.index({ senderId: 1, receiverId: 1, status: 1 });

const Connection = mongoose.model("Connection", connectionSchema);
export default Connection;  