import express, { Router } from "express";
import { getAllContacts, getMessageByUserId, sendMessage, getChatPartners } from "../controllers/mesage.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js"
import { arcjetProtection } from "../middleware/arcjet.middleware.js";


const router = express.Router();
router.use(arcjetProtection, protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessageByUserId);
router.post("send/:id", sendMessage);



export default router;