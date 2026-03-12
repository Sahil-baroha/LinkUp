import mongoose from "mongoose";

const likeSchema = mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    }
}, { timestamps: true });

// Compound unique index: one like per user per post
likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

const Like = mongoose.model("Like", likeSchema);

export default Like;
