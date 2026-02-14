import User from "../models/user.model.js";
import bcrypt from "bcrypt";

export const register = async (req, res) => {

    try {
        const { name, email, password, username } = req.body;
        if (!name || !email || !password || !username) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
                error: "Bad Request"
            })
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
                error: "Bad Request"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            username
        })

        await newUser.save();

        const profile = new Profile({ userId: newUser._id })


        console.log("New user Registered with profile : ", JSON.stringify({ profile: newUser._id, username: newUser.username, email: newUser.email }))
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
        })

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: e.message
        })
    }

}