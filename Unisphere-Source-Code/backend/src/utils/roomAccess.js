import mongoose from "mongoose";
import { EventGroup } from "../models/eventGroup.model.js";
import { Club } from "../models/club.model.js";
import { DirectConversation } from "../models/directConversation.model.js";

// used by both socket / chat.socket and chat.controller to check if user has access to the room

export const verifyRoomAccess = async (user, roomType, roomId, errorFactory) => {
    if(!mongoose.Types.ObjectId.isValid(roomId)) {
        throw errorFactory(400, "Invalid room ID");
    }
    if(!["EventGroup", "Club", "DirectConversation"].includes(roomType)) {
        throw errorFactory(400, "Invalid room type");
    }

    if(roomType === "EventGroup") {
        const group = await EventGroup.findById(roomId).select("status members event");
        if(!group){
            throw errorFactory(404, "Event group not found");
        }
        if(group.status === "dissolved"){
            throw errorFactory(403, "Event group is dissolved");
        }
        if(["admin", "superadmin"].includes(user.role)){
            return group;
        }
        const isMember = group.members.some(member => member.user.toString() === user._id.toString());
        if(!isMember){
            throw errorFactory(403, "You are not a member of this event group");
        }
        return group;
    }
    if(roomType === "Club"){
        const club = await Club.findById(roomId).select("status members advisors president vicePresident");
        if(!club){
            throw errorFactory(404, "Club not found");
        }
        if(club.status !== "active"){
            throw errorFactory(403, "Club is not active");
        }
        if(["admin", "superadmin"].includes(user.role)){
            return club;
        }

        const userId = user._id.toString();
        const hasAccess = club.members.some(id => id.toString() === userId) ||
            club.advisors.some(id => id.toString() === userId) ||
            club.president?.toString() === userId ||
            club.vicePresident?.toString() === userId;

            if(!hasAccess){
                throw errorFactory(403, "You are not a member of this club");
            }
            return club;
    }

    if(roomType === "DirectConversation"){
        const conversation = await DirectConversation.findById(roomId).select("participants");
        if(!conversation){
            throw errorFactory(404, "Conversation not found");
        }

        const requesterModel = ["admin", "superadmin"].includes(user.role)
            ? "Admin"
            : ["faculty", "hod"].includes(user.role)
                ? "Faculty"
                : "Student";

        const hasAccess = conversation.participants.some(
            (participant) => participant.user.toString() === user._id.toString() && participant.userModel === requesterModel
        );

        if(!hasAccess){
            throw errorFactory(403, "You are not part of this conversation");
        }

        return conversation;
    }
}

export const getRoomKey = (roomType, roomId) => 
    `${roomType.toLowerCase()}:${roomId}`;
