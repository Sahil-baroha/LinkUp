import { Routes } from "express";

const router = Router();


router.route('/').get((req, res) => {
    res.send("Hello Home")
})