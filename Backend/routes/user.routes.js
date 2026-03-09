import { Router } from "express";
import multer from "multer";

import { register, uploadProfilePicture, updateUserProfile, login } from "../controllers/user.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { registerSchema, loginSchema, updateProfileSchema } from "../validators/user.validator.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })


router.route("/update_profile_picture").post(authenticate, upload.single("profileImage"), uploadProfilePicture)

router.route('/register').post(validate(registerSchema), register)

router.route('/login').post(validate(loginSchema), login)

router.route('/user_update').post(authenticate, validate(updateProfileSchema), updateUserProfile)

export default router;