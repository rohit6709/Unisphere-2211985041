import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Student } from '../models/student.model.js';
import { Faculty } from '../models/faculty.model.js';
import { Admin } from '../models/admin.model.js';
import { registerChatHandlers } from './chat.socket.js';

let _io = null;
const connectedUsers = new Map();

const markUserOnline = (userId) => {
    const key = userId.toString();
    const nextCount = (connectedUsers.get(key) || 0) + 1;
    connectedUsers.set(key, nextCount);
    return nextCount === 1;
}

const markUserOffline = (userId) => {
    const key = userId.toString();
    const currentCount = connectedUsers.get(key) || 0;

    if(currentCount <= 1){
        connectedUsers.delete(key);
        return true;
    }

    connectedUsers.set(key, currentCount - 1);
    return false;
}

const getOnlineUserIds = () => Array.from(connectedUsers.keys());

export const getIO = () => {
    if(!_io){
        throw new Error("Socket.io not initialized - call initSocket first");
    }
    return _io;
}

export const initSocketServer = (httpServer) => {
    _io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            methods: ["GET", "POST"],
            credentials: true
        },
        pingTimeout: 60000, // 60 seconds
        pingInterval: 25000, // 25 seconds
    })

    _io.use(async (socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers?.cookie || "";
            const token = parseCookie(cookieHeader, "accessToken");

            if(!token){
                return next(new Error("Authentication error: No token provided"));
            }

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            } catch (error) {
                if(error.name === "TokenExpiredError"){
                    return next(new Error("Authentication error: Token expired - please log in again"));
                }
                return next(new Error("Authentication error: Invalid token"));
            }

            let user = null;
            let userModel = null;

            const isStudentRole = ["student", "club_president", "club_vice_president"].includes(decoded.role);
            const isFacultyRole = ["faculty", "hod"].includes(decoded.role);
            const isAdminRole = ["admin", "superadmin"].includes(decoded.role);

            if(isStudentRole){
                user = await Student.findById(decoded._id).select("_id name role isActive");
                userModel = "Student";
            }
            else if(isFacultyRole){
                user = await Faculty.findById(decoded._id).select("_id name role isActive");
                userModel = "Faculty";
            }
            else if(isAdminRole){
                user = await Admin.findById(decoded._id).select("_id name role isActive");
                userModel = "Admin";
            }

            if(!user){
                return next(new Error("Authentication error: User not found"));
            }
            if(!user.isActive){
                return next(new Error("Authentication error: User account is inactive - contact administrator"));
            }

            socket.user = {
                _id: user._id,
                name: user.name,
                role: user.role,
                model: userModel
            };
            return next();
        } catch (error) {
            console.error("Socket authentication error:", error.message);
            return next(new Error("AUTH_ERROR: Authentication failed"));
        }
    })

    _io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user.name} (${socket.user.role}) - Socket ID: ${socket.id}`);

        socket.join(`user:${socket.user._id}`);
        socket.emit("presence_snapshot", { userIds: getOnlineUserIds() });

        if(markUserOnline(socket.user._id)){
            _io.emit("presence_changed", {
                userId: socket.user._id.toString(),
                isOnline: true
            });
        }

        registerChatHandlers(_io, socket);

        socket.on("disconnect", (reason) => {
            if(markUserOffline(socket.user._id)){
                _io.emit("presence_changed", {
                    userId: socket.user._id.toString(),
                    isOnline: false
                });
            }
            console.log(`User disconnected: ${socket.user.name} (${socket.user.role}) - Socket ID: ${socket.id} - Reason: ${reason}`);
        })
    })

    console.log("Socket.io server initialized");
    return _io;
}

const parseCookie = (cookieHeader, cookieName) => {
    if(!cookieHeader) return null;
    const match = cookieHeader.split(";").map(cookie => cookie.trim()).find(cookie => cookie.startsWith(`${cookieName}=`));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
}
