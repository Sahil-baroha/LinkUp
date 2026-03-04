import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {

    try {
        console.log("Registering user : ", req.body)
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


export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) res.status(404).json({
        success: false,
        message: "Creadentials not provided !",
        error: "Bad Request"
    })

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
            error: "Not Found"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid password",
            error: "Unauthorized"
        })
    }
    if (isPasswordValid) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 60 * 60 * 1000 })
        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            token
        })
    }


}


export const uploadProfilePicture = async (req, res) => {
    const token = req.cookies.token;
    console.log("Token : ", token);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded : ", decoded);
        const user = await User.findById(decoded.id);
        console.log("User : ", user);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                error: "Not Found"
            })
        }

        user.profilePicture = req.file.path;
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        await user.save();
        return res.status(200).json({
            success: true,
            message: "Profile picture uploaded successfully",
            profilePicture: user.profilePicture
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            error: error.message
        })
    }
}

export const updateUserProfile = async (req, res) => {
    try {
        const { token, ...newUserData } = req.body;
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                error: "Not Found"
            })
        }
        const { username, email } = newUserData;
        const existingUser = await User.findOne({ or$: [{ username }, { email }] })

        if (existingUser || String(existingUser._id !== String(user._id))) {
            return res.status(400).json({
                success: false,
                message: "User already exists",
                error: "Bad Request"
            })
        }

        Object.assign(user, newUserData);
        await user.save();
        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            error: error.message
        })
    }
}




// Review this code and Understand how the (updateUserProfile) Flow works , also methods like Object.assign , object Deconstructor with rest Operator 17/2/26 11:45 PM