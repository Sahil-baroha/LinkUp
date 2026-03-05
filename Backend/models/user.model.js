import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    active: {
        type: Boolean,
        default: true
    },
    password: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: ''
    },

}, { timestamps: true });

// Add compound indexes for quick querying
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

const User = mongoose.model("User", userSchema);

export default User;
