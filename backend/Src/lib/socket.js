import { Server } from "socket.io";
import http from "http";
import express from "express";
import "dotenv/config"
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [process.env.CLIENT_URL],
        credentials: true,
    },
});

// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

// we will use this function to check if the user is online or not
export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// this is for storig online users
const userSocketMap = {}; // {userId:socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.user.fullName);

    const userId = socket.userId;
    userSocketMap[userId] = socket.id;

    // io.emit() is used to send events to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // with socket.on we listen for events from clients
    socket.on("call:invite", ({ to, offer }) => {
        const receiverSocketId = getReceiverSocketId(to);

        if (!receiverSocketId) {
            socket.emit("call:error", {
                type: "offline",
                to,
                message: "User is offline",
            });
            return;
        }

        io.to(receiverSocketId).emit("call:incoming", {
            from: userId,
            fromUser: socket.user,
            offer,
        });
    });

    socket.on("call:accept", ({ to, answer }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (!receiverSocketId) return;

        io.to(receiverSocketId).emit("call:accepted", {
            from: userId,
            answer,
        });
    });

    socket.on("call:reject", ({ to }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (!receiverSocketId) return;

        io.to(receiverSocketId).emit("call:rejected", {
            from: userId,
        });
    });

    socket.on("call:end", ({ to }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (!receiverSocketId) return;

        io.to(receiverSocketId).emit("call:ended", {
            from: userId,
        });
    });

    socket.on("call:signal", ({ to, candidate }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (!receiverSocketId) return;

        io.to(receiverSocketId).emit("call:signal", {
            from: userId,
            candidate,
        });
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected", socket.user.fullName);
        io.emit("call:user-disconnected", { userId });
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
