import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000
    },
    image: {
        type: String,
        default: null
    }
}, { timestamps: true });

postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model("Post", postSchema);
export default Post;