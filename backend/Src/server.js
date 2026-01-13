// const express = require('express')
import express from "express"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import authRoutes from "./routes/auth.route.js"
import messageRoutes from "./routes/message.route.js"
import path from "path"
import { connectDB } from "./lib/db.js"
import cors from "cors";
import { app, server } from "./lib/socket.js"


dotenv.config();
const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();


app.use(express.json({ limit: "5mb" }));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);


// ready for deployement
if (process.env.NODE_ENV == "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")))

    app.get("*", (_, res) => {
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
    })
}

server.listen(PORT, () => {
    console.log(`Listen on port ${PORT}.`);
    connectDB();
})  