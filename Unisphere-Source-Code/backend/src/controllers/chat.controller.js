import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { EventGroup } from "../models/eventGroup.model.js";
import { Club } from "../models/club.model.js";
import { DirectConversation } from "../models/directConversation.model.js";
import { Student } from "../models/student.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Admin } from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyRoomAccess } from "../utils/roomAccess.js";

const restError = (msg, status = 400) => new ApiError(status, msg);

const validateObjectId = (id, label = "ID") => {
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(400, `Invalid ${label}`);
    }
}

const resolveActorModel = (role) => {
    if(["admin", "superadmin"].includes(role)) return "Admin";
    if(["faculty", "hod"].includes(role)) return "Faculty";
    return "Student";
}

const resolveUserLookup = (model) => {
    if(model === "Student") return Student;
    if(model === "Faculty") return Faculty;
    if(model === "Admin") return Admin;
    throw new ApiError(400, "Unsupported user model");
}

const formatDirectConversation = (conversation, currentUserId, currentUserModel, lastMessage = null) => {
    const otherParticipant = (conversation.participants || []).find(
        (participant) => participant.user?._id?.toString() !== currentUserId.toString() || participant.userModel !== currentUserModel
    ) || conversation.participants?.[0];

    return {
        roomType: "DirectConversation",
        roomId: conversation._id,
        name: otherParticipant?.user?.name || "Direct Message",
        participant: otherParticipant?.user ? {
            _id: otherParticipant.user._id,
            name: otherParticipant.user.name,
            role: otherParticipant.user.role,
            department: otherParticipant.user.department || null,
            rollNo: otherParticipant.user.rollNo || null,
            employeeId: otherParticipant.user.employeeId || null,
            userModel: otherParticipant.userModel
        } : null,
        lastMessage: lastMessage || null,
        status: "active"
    };
}

const getMessageHistory = asyncHandler(async (req, res) => {
    const { roomType, roomId } = req.params;
    const { before, limit = 50 } = req.query;

    validateObjectId(roomId, "room ID");
    if(!["EventGroup", "Club", "DirectConversation"].includes(roomType)){
        throw new ApiError(400, "Room type must be EventGroup, Club, or DirectConversation");
    }
    if(roomType === "EventGroup"){
        const group = await EventGroup.findById(roomId).select("status members");
        if(!group){
            throw new ApiError(404, "Event group not found");
        }

        const isAdmin = ["admin", "superadmin"].includes(req.user.role);
        if(!isAdmin){
            const isMember = group.members.some(member => member.user.toString() === req.user._id.toString());
            if(!isMember){
                throw new ApiError(403, "You are not a member of this event group");
            }
        }
    }
    else{
        // Club
        await verifyRoomAccess(req.user, roomType, roomId, restError);
    }
    const filter = { room: roomId, roomType };
    if(before){
        validateObjectId(before, "cursor ID");
        filter._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const parsedLimit = Math.min(Number(limit), 50);

    const messages = await Message.find(filter)
        .populate("sender", "name rollNo employeeId")
        .sort({ _id: -1 })
        .limit(parsedLimit);

        messages.reverse();

        const hasMore = messages.length === parsedLimit;
        const nextCursor = messages.length > 0 ? messages[0]._id : null;

        return res.status(200)
            .json(new ApiResponse(200, { messages, nextCursor, hasMore }, "Messages retrieved successfully"));
})

const deleteMessage = asyncHandler(async (req, res) => {
    const { roomType, roomId, messageId } = req.params;

    validateObjectId(roomId, "room ID");
    validateObjectId(messageId, "message ID");

    if(!["EventGroup", "Club", "DirectConversation"].includes(roomType)){
        throw new ApiError(400, "Room type must be EventGroup, Club, or DirectConversation");
    }

    const message = await Message.findOne({ _id: messageId, room: roomId, roomType });
    if(!message){
        throw new ApiError(404, "Message not found");
    }
    if(message.isDeleted){
        throw new ApiError(400, "Message already deleted");
    }

    const isSender = message.sender?.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin"].includes(req.user.role);

    let isAdvisor = false;
    if(roomType === "EventGroup"){
        const group = await EventGroup.findById(roomId).select("members");
        isAdvisor = group?.members.some(member => member.user.toString() === req.user._id.toString() && member.role === "advisor")
    }
    else if(roomType === "Club"){
        const club = await Club.findById(roomId).select("advisors");
        isAdvisor = club?.advisors.some(id => id.toString() === req.user._id.toString());
    }

    const canDelete = roomType === "DirectConversation"
        ? isSender
        : (isSender || isAdmin || isAdvisor);

    if(!canDelete){
        throw new ApiError(403, "You do not have permission to delete this message");
    }

    const resolveModel = (role) => {
        if(["admin", "superadmin"].includes(role)){
            return "Admin";
        }
        if(["faculty", "hod"].includes(role)){
            return "Faculty";
        }
        return "Student";
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    message.deletedByModel = resolveModel(req.user.role);
    message.content = null;
    message.fileUrl = null;
    message.fileName = null;
    message.fileType = null;
    message.fileSize = null;

    await message.save();

    try {
        const { getIO } = await import("../sockets/socket.js");
        const { getRoomKey } = await import("../utils/roomAccess.js");

        const io = getIO();
        const roomKey = getRoomKey(roomType, roomId);

        io.to(roomKey).emit("message_deleted", { messageId: message._id, deletedAt: message.deletedAt });
    } catch (error) {
        console.error("Error occurred while emitting message_deleted event:", error);
    }

    return res.status(200).json(new ApiResponse(200, { messageId: message._id }, "Message deleted successfully"));

})

const getMyRooms = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userModel = resolveActorModel(req.user.role);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const clubQuery = ["admin", "superadmin"].includes(req.user.role)
        ? []
        : ["faculty", "hod"].includes(req.user.role)
            ? Club.find({ advisors: userId, status: "active" }).select("name department").lean()
            : Club.find({
                status: "active",
                $or: [
                    { members: userId },
                    { president: userId },
                    { vicePresident: userId }
                ]
            }).select("name department").lean();

    const eventGroupQuery = ["admin", "superadmin"].includes(req.user.role)
        ? []
        : EventGroup.find({ "members.user": userObjId, status: "active" })
            .select("name event status")
            .populate("event", "title")
            .lean();

    const directConversationQuery = DirectConversation.find({
        participants: { $elemMatch: { user: userId, userModel } }
    })
        .populate("participants.user", "name role department rollNo employeeId")
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();

    const [clubs, eventGroups, conversations] = await Promise.all([
        Promise.resolve(clubQuery),
        Promise.resolve(eventGroupQuery),
        directConversationQuery
    ]);

    const roomRefs = [
        ...clubs.map((club) => ({ roomId: club._id, roomType: "Club" })),
        ...eventGroups.map((group) => ({ roomId: group._id, roomType: "EventGroup" })),
        ...conversations.map((conversation) => ({ roomId: conversation._id, roomType: "DirectConversation" }))
    ];

    const lastMessages = roomRefs.length
        ? await Message.aggregate([
            {
                $match: {
                    $or: roomRefs.map((room) => ({
                        room: new mongoose.Types.ObjectId(room.roomId),
                        roomType: room.roomType,
                        isDeleted: false
                    }))
                }
            },
            { $sort: { _id: -1 } },
            {
                $group: {
                    _id: { room: "$room", roomType: "$roomType" },
                    message: { $first: "$$ROOT" }
                }
            }
        ])
        : [];

    const lastMessageMap = new Map(
        lastMessages.map((entry) => [`${entry._id.roomType}:${entry._id.room}`, entry.message])
    );

    const rooms = [
        ...clubs.map((club) => ({
            roomType: "Club",
            roomId: club._id,
            name: club.name,
            department: club.department || null,
            status: "active",
            lastMessage: lastMessageMap.get(`Club:${club._id}`) || null
        })),
        ...eventGroups.map((group) => ({
            roomType: "EventGroup",
            roomId: group._id,
            name: group.name,
            eventTitle: group.event?.title || null,
            status: group.status,
            lastMessage: lastMessageMap.get(`EventGroup:${group._id}`) || null
        })),
        ...conversations.map((conversation) => formatDirectConversation(
            conversation,
            userId,
            userModel,
            lastMessageMap.get(`DirectConversation:${conversation._id}`) || null
        ))
    ].sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
    });

    return res.status(200).json(new ApiResponse(200, { rooms }, "Rooms retrieved successfully"));
});

const searchChatUsers = asyncHandler(async (req, res) => {
    const search = (req.query.search || "").trim();
    const limit = Math.min(Number(req.query.limit) || 8, 20);
    const requesterId = req.user._id.toString();
    const requesterModel = resolveActorModel(req.user.role);

    if(search.length < 2){
        return res.status(200).json(new ApiResponse(200, { users: [] }, "Users retrieved successfully"));
    }

    const regex = { $regex: search, $options: "i" };
    const [students, faculty, admins] = await Promise.all([
        Student.find({
            isActive: true,
            _id: { $ne: req.user._id },
            $or: [{ name: regex }, { email: regex }, { rollNo: regex }]
        }).select("name role department rollNo").limit(limit).lean(),
        Faculty.find({
            isActive: true,
            _id: { $ne: req.user._id },
            $or: [{ name: regex }, { email: regex }, { employeeId: regex }]
        }).select("name role department employeeId").limit(limit).lean(),
        Admin.find({
            isActive: true,
            _id: { $ne: req.user._id },
            $or: [{ name: regex }, { email: regex }]
        }).select("name role").limit(limit).lean()
    ]);

    const users = [
        ...students.map((user) => ({ ...user, userModel: "Student" })),
        ...faculty.map((user) => ({ ...user, userModel: "Faculty" })),
        ...admins.map((user) => ({ ...user, userModel: "Admin" }))
    ]
        .filter((user) => !(user._id.toString() === requesterId && user.userModel === requesterModel))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, limit);

    return res.status(200).json(new ApiResponse(200, { users }, "Users retrieved successfully"));
});

const createDirectConversation = asyncHandler(async (req, res) => {
    const { targetUserId, targetUserModel } = req.body;
    const requesterModel = resolveActorModel(req.user.role);

    validateObjectId(targetUserId, "target user ID");
    if(!["Student", "Faculty", "Admin"].includes(targetUserModel)){
        throw new ApiError(400, "Invalid target user model");
    }
    if(targetUserId === req.user._id.toString() && targetUserModel === requesterModel){
        throw new ApiError(400, "You cannot create a direct conversation with yourself");
    }

    const TargetModel = resolveUserLookup(targetUserModel);
    const targetUser = await TargetModel.findById(targetUserId).select("name role department rollNo employeeId isActive").lean();
    if(!targetUser || targetUser.isActive === false){
        throw new ApiError(404, "Target user not found or inactive");
    }

    const participantHash = [
        `${requesterModel}:${req.user._id}`,
        `${targetUserModel}:${targetUserId}`
    ].sort().join("__");

    let conversation = await DirectConversation.findOne({ participantHash })
        .populate("participants.user", "name role department rollNo employeeId")
        .lean();
    const existedAlready = Boolean(conversation);

    if(!conversation){
        conversation = await DirectConversation.create({
            participants: [
                { user: req.user._id, userModel: requesterModel },
                { user: targetUserId, userModel: targetUserModel }
            ],
            participantHash,
            createdBy: req.user._id,
            createdByModel: requesterModel
        });

        conversation = await DirectConversation.findById(conversation._id)
            .populate("participants.user", "name role department rollNo employeeId")
            .lean();
    }

    try {
        const { getIO } = await import("../sockets/socket.js");
        const io = getIO();

        io.to(`user:${targetUserId}`).emit("conversation_created", {
            room: formatDirectConversation(conversation, targetUserId, targetUserModel)
        });

        if(existedAlready){
            io.to(`user:${req.user._id.toString()}`).emit("conversation_created", {
                room: formatDirectConversation(conversation, req.user._id, requesterModel)
            });
        }
    } catch (error) {
        console.error("Failed to emit conversation_created event:", error.message);
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                room: formatDirectConversation(conversation, req.user._id, requesterModel)
            },
            "Direct conversation ready"
        )
    );
});

export { getMessageHistory, deleteMessage, getMyRooms, searchChatUsers, createDirectConversation };
