import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true,
        index: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    }
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;