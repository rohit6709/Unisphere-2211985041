import mongoose from "mongoose";
import { EventGroup } from "../models/eventGroup.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validateObjectId = (id, label = "ID") => {
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(400, `${label} is not a valid ObjectId`);
    }
};

const verifyGroupMember = async (group, userId) => {
    const isMember = group.members.some(m => m.user.toString() === userId.toString());
    if(!isMember){
        throw new ApiError(403, "You are not a member of this event group");
    }
}

const getEventGroup = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const group = await EventGroup.findOne({
        event: eventId,
        club: req.club._id
    }).populate("event", "title status startsAt endsAt")
      .populate("members.user", "name email rollNo employeeId department");

      if(!group){
        throw new ApiError(404, "Event group not found");
      }

      const isAdmin = ["admin", "superadmin"].includes(req.clubRole);
      const isAdvisor = req.clubRole === "advisor";

      if(!isAdmin && !isAdvisor){
        verifyGroupMember(group, req.user._id);
      }

      return res.status(200).json(new ApiResponse(200, group, "Event group retrieved successfully"));
})

//Members, advisor, admin : get members of Event Group
const getEventGroupMembers = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const { page = 1, limit = 20, role } = req.query;

    const group = await EventGroup.findOne({
        event: eventId,
        club: req.club._id
    })
    if(!group){
        throw new ApiError(404, "Event group not found");
    }

    const isAdmin = ["admin", "superadmin"].includes(req.clubRole);
    const isAdvisor = req.clubRole === "advisor";

    if(!isAdmin && !isAdvisor){
        verifyGroupMember(group, req.user._id);
    }

    let members = group.members;
    if(role){
        members = members.filter(m => m.role === role);
    }

    const total = members.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginated = members.slice(skip, skip + Number(limit));

    const populated = await EventGroup.populate(paginated, {
        path: "user",
        select: "name email rollNo employeeId department"
    })

    return res.status(200).json(new ApiResponse(200, {
        members: populated,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }
    }, "Event group members retrieved successfully"));
})

//Advisor, president, VP : cannot leave group, only members can leave group but stays registered for event
const leaveEventGroup = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const group = await EventGroup.findOne({
        event: eventId,
        club: req.club._id
    })
    if(!group){
        throw new ApiError(404, "Event group not found");
    }
    if(group.status === "dissolved"){
        throw new ApiError(400, "Event group is dissolved, cannot leave");
    }

    const member = group.members.find(m => m.user.toString() === req.user._id.toString());
    if(!member){
        throw new ApiError(403, "You are not a member of this event group");
    }

    if(["advisor", "president", "vicePresident"].includes(member.role)){
        throw new ApiError(400, `As a ${member.role}, you cannot leave the event group`);
    }

    await EventGroup.findByIdAndUpdate(
        group._id,
        { $pull: { members: { user: req.user._id } } }
    )

    return res.status(200).json(new ApiResponse(200, {}, "Successfully left the event group"));
})

export {
    getEventGroup,
    getEventGroupMembers,
    leaveEventGroup
}