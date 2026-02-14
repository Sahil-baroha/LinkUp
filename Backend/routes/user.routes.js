import { Router } from "express";
import { register } from "../controllers/user.controller.js";

const router = Router();


router.route('/').get((req, res) => {
    res.send("Hello Home")
})

router.route('/register').get(register)

