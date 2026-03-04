import { Router } from "express";
import { register, uploadProfilePicture } from "../controllers/user.controller.js";
import { login } from "../controllers/user.controller.js";
import multer from "multer";

const router = Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
})

const upload = multer({ storage: storage })


router.route("/update_profile_picture").post(upload.single("profileImage"), uploadProfilePicture)
router.route('/register').post(register)
router.route('/login').post(login)
router.route('/user_update').post(updateUserProfile)


export default router;