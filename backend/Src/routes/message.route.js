import express, { Router } from "express";

const router = express.Router();

router.get("/send", (req, res) => {
    res.send("send message endpoint.")
})

router.get("/receive", (req, res) => {
    res.send("receive message endpoint.")
})

export default router;