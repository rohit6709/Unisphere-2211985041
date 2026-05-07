import { Router } from "express";
import { getMessageHistory, deleteMessage, getMyRooms, searchChatUsers, createDirectConversation } from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const chatRouter = Router();

chatRouter.route("/rooms").get(verifyJWT, getMyRooms);
chatRouter.route("/users/search").get(verifyJWT, searchChatUsers);
chatRouter.route("/direct-conversations").post(verifyJWT, createDirectConversation);
chatRouter.route("/:roomType/:roomId/messages").get(verifyJWT, getMessageHistory);
chatRouter.route("/:roomType/:roomId/messages/:messageId").delete(verifyJWT, deleteMessage);

export default chatRouter;
