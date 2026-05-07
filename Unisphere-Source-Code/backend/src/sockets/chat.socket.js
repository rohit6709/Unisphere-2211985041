import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { EventGroup } from "../models/eventGroup.model.js";
import { Club } from "../models/club.model.js";
import { DirectConversation } from "../models/directConversation.model.js";
import { verifyRoomAccess, getRoomKey } from "../utils/roomAccess.js";


const socketError = (status, msg) => new Error(msg);

const formatMessage = (msg) => {
    const obj = msg.toObject ? msg.toObject() : msg;
    if(obj.isDeleted){
        return {
            _id: obj._id,
            room: obj.room,
            roomType: obj.roomType,
            type: obj.type,
            isDeleted: true,
            deletedAt: obj.deletedAt,
            createdAt: obj.createdAt,
        }
    }
    return obj;
}

const typingTimestamps = new Map();
const TYPING_THROTTLE = 2000; // 2 seconds

export const registerChatHandlers = (io, socket) => {
    // Handle joining a room
    socket.on("join_room", async ({ roomType, roomId }) => {
        try {
            await verifyRoomAccess(socket.user, roomType, roomId, socketError);

            const roomKey = getRoomKey(roomType, roomId);
            socket.join(roomKey);

            socket.emit("room_joined", { roomType, roomId, roomKey });
            console.log(`User ${socket.user._id} joined room ${roomKey}`);
        
        } catch (error) {
            socket.emit("chat_error", { event: "join_room", message: error.message });
        }
    })

    // Handle sending a message
    socket.on("send_message", async (payload) => {
        try {
            const {
                roomType, roomId,
                type = "text",
                content, fileUrl, fileName, fileType, fileSize,
                tempId // Client-side temporary ID for optimistic UI
            } = payload;

            if(!roomType || !roomId){
                return socket.emit("chat_error", { event: "send_message", message: "roomType and roomId are required" });
            }

            await verifyRoomAccess(socket.user, roomType, roomId, socketError);

            if(type === "text"){
                if(!content || content.trim() === ""){
                    return socket.emit("chat_error", { event: "send_message", message: "Message content cannot be empty" });
                }
                if(content.trim().length > 2000){
                    return socket.emit("chat_error", { event: "send_message", message: "Message exceeds 2000 character limit" });
                }
            }
            if(["image", "file"].includes(type) && !fileUrl){
                return socket.emit("chat_error", { event: "send_message", message: "fileUrl is required for image/file messages" });
            }

            const message = await Message.create({
                room: roomId,
                roomType,
                sender: socket.user._id,
                senderModel: socket.user.model,
                type,
                content: content ? content.trim() : null,
                fileUrl: fileUrl || null,
                fileName: fileName || null,
                fileType: fileType || null,
                fileSize: fileSize || null,
            })

            if(roomType === "DirectConversation"){
                await DirectConversation.findByIdAndUpdate(roomId, { lastMessageAt: message.createdAt });
            }

            const populated = await Message.findById(message._id)
                .populate("sender", "name rollNo employeeId");

            const roomKey = getRoomKey(roomType, roomId);
            
            // Format and attach tempId for the sender to handle optimistic replacement
            const finalMessage = formatMessage(populated);
            if (tempId) finalMessage.tempId = tempId;

            io.to(roomKey).emit("new_message", finalMessage);
        } catch (error) {
            console.error("Error in send_message:", error.message);
            socket.emit("chat_error", { event: "send_message", message: error.message });
        }
    })

    // Handle deleting a message
    socket.on("delete_message", async ({ messageId }) => {
        try {
            if(!mongoose.Types.ObjectId.isValid(messageId)){
                return socket.emit("chat_error", { event: "delete_message", message: "Invalid message ID" });
            }

            const message = await Message.findById(messageId);
            if(!message){
                return socket.emit("chat_error", { event: "delete_message", message: "Message not found" });
            }
            if(message.isDeleted){
                return socket.emit("chat_error", { event: "delete_message", message: "Message already deleted" });
            }

            const isSender = message.sender?.toString() === socket.user._id.toString();
            const isAdmin = ["admin", "superadmin"].includes(socket.user.role);

            let isAdvisor = false;
            if(message.roomType === "EventGroup"){
                const group = await EventGroup.findById(message.room).select("members");
                isAdvisor = group?.members.some(
                    member => member.user.toString() === socket.user._id.toString() && member.role === "advisor"
                );
            }
            else if(message.roomType === "Club"){
                const club = await Club.findById(message.room).select("advisors");
                isAdvisor = club?.advisors.some(
                    id => id.toString() === socket.user._id.toString()
                )
            }

            const canDelete = message.roomType === "DirectConversation"
                ? isSender
                : (isSender || isAdmin || isAdvisor);

            if(!canDelete){
                return socket.emit("chat_error", { event: "delete_message", message: "You do not have permission to delete this message" });
            }

            message.isDeleted = true;
            message.deletedAt = new Date();
            message.deletedBy = socket.user._id;
            message.deletedByModel = isAdmin ? "Admin" : socket.user.model;
            message.content = null;
            message.fileUrl = null;
            message.fileName = null;
            message.fileType = null;
            message.fileSize = null;

            await message.save();

            const roomKey = getRoomKey(message.roomType, message.room.toString());

            io.to(roomKey).emit("message_deleted", { messageId: message._id, deletedAt: message.deletedAt });
        } catch (error) {
            console.error("Error in delete_message:", error.message);
            socket.emit("chat_error", { event: "delete_message", message: error.message });
        }
    })

    // Handle typing indicator
    socket.on("typing", async ({ roomType, roomId, isTyping }) => {
        try {
            const roomKey = getRoomKey(roomType, roomId);
            const throttleKey = `${socket.id}:${roomKey}`;
            const now = Date.now();
            const last  = typingTimestamps.get(throttleKey) || 0;

            if(now - last < TYPING_THROTTLE){
                return; // Throttle typing events to prevent spamming
            }
            typingTimestamps.set(throttleKey, now);

            socket.to(roomKey).emit("user_typing", { userId: socket.user._id, name: socket.user.name, isTyping });
        } catch (error) {
            console.error("Error in typing:", error.message);
            socket.emit("chat_error", { event: "typing", message: error.message });
        }
    })

    // Handle leaving a room
    socket.on("leave_room", ({ roomType, roomId }) => {
        const roomKey = getRoomKey(roomType, roomId);
        socket.leave(roomKey);
        socket.emit("room_left", { roomType, roomId });
        console.log(`User ${socket.user._id} left room ${roomKey}`);
    })

    // cleanup typing throttle on disconnect
    socket.on("disconnect", () => {
        for(const key of typingTimestamps.keys()){
            if(key.startsWith(socket.id)){
                typingTimestamps.delete(key);
            }
        }
    });
}

export const emitSystemMessage = async ({ roomType, roomId, content }) => {
    try {
        const { getIO } = await import("./socket.js");
        const io = getIO();

        const msg = await Message.create({
            room: roomId,
            roomType,
            sender: null,
            senderModel: null,
            type: "system",
            content
        })

        const roomKey = getRoomKey(roomType, roomId);
        io.to(roomKey).emit("system_message", msg);

        return msg;
    } catch (error) {
        console.error("Error in emitSystemMessage:", error.message);
        return null;
    }
}
