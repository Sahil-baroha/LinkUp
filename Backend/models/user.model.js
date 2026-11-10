import mongoose from "mongoose";

const currentYear = new Date().getFullYear();

const experienceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    company: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    startDate: {
        type: String,
        required: true,
        match: [/^\d{4}-(0[1-9]|1[0-2])$/, "startDate must be in YYYY-MM format"],
    },
    endDate: {
        type: String,
        default: null,
        validate: {
            validator: function(val) {
                if (val === null || val === undefined || val === "") return true;
                if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(val)) return false;
                if (this.current && val !== null && val !== undefined) return false;
                if (this.startDate && val < this.startDate) return false;
                return true;
            },
            message: "endDate must be in YYYY-MM format or null, cannot be before startDate, and must be null if current is true",
        },
    },
    current: {
        type: Boolean,
        default: false,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
    },
}, { _id: false });

const educationSchema = new mongoose.Schema({
    school: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    degree: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
    },
    field: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
    },
    startYear: {
        type: Number,
        required: true,
        min: 1950,
        max: currentYear + 8,
        validate: {
            validator: Number.isInteger,
            message: "startYear must be an integer",
        },
    },
    endYear: {
        type: Number,
        default: null,
        validate: {
            validator: function(val) {
                if (val === null || val === undefined) return true;
                if (!Number.isInteger(val)) return false;
                if (this.startYear !== undefined && val < this.startYear) return false;
                return true;
            },
            message: "endYear must be an integer not before startYear, or null",
        },
    },
}, { _id: false });

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 60,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    active: {
        type: Boolean,
        default: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: {
        type: String,
        default: "",
    },
    headline: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "",
    },
    about: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
    },
    location: {
        type: String,
        trim: true,
        maxlength: 80,
        default: "",
    },
    skills: {
        type: [{
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 40,
        }],
        default: [],
        set: function(val) {
            if (!Array.isArray(val)) return val;
            const seen = new Set();
            const result = [];
            for (const item of val) {
                const key = typeof item === "string" ? item.trim().toLowerCase() : item;
                if (!seen.has(key)) {
                    seen.add(key);
                    result.push(typeof item === "string" ? item.trim() : item);
                }
            }
            return result;
        },
        validate: [
            {
                validator: (val) => !val || val.length <= 20,
                message: "skills cannot exceed 20 items",
            },
        ],
    },
    experience: {
        type: [experienceSchema],
        default: [],
        validate: [
            {
                validator: (val) => {
                    if (!val) return true;
                    if (val.length > 10) return false;
                    for (const item of val) {
                        if (item.current && item.endDate !== null && item.endDate !== undefined) return false;
                        if (item.startDate && item.endDate && item.endDate < item.startDate) return false;
                    }
                    return true;
                },
                message: "experience entries validation failed",
            },
        ],
    },
    education: {
        type: [educationSchema],
        default: [],
        validate: [
            {
                validator: (val) => {
                    if (!val) return true;
                    if (val.length > 5) return false;
                    for (const item of val) {
                        if (item.startYear && item.endYear !== null && item.endYear !== undefined && item.endYear < item.startYear) return false;
                    }
                    return true;
                },
                message: "education entries validation failed",
            },
        ],
    },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
