import mongoose from "mongoose";
import { Club } from '../models/club.model.js';
import { Event } from "../models/event.model.js";
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getClubProfile = asyncHandler(async (req, res) => {
    const { clubId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(clubId)){
        throw new ApiError(400, "Invalid club ID");
    }
    const [club, upcomingEvents] = await Promise.all([
        Club.findById(clubId)
            .populate("president", "name rollNo department")
            .populate("advisors", "name employeeId department designation")
            .select("name description department president advisors members status tags createdAt"),

        Event.find({
            club: clubId,
            status: { $in: ["approved", "live"] },
            startsAt: { $gte: new Date() }
        })
        .select("title eventType status startsAt endsAt venue maxParticipants registrationDeadline posterUrl isFeatured isFeatured visibility")
        .sort({ startsAt: 1 })
        .limit(5)
        .lean()
    ]);

    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== "active"){
        throw new ApiError(403, "Club is not active");
    }
    const memberCount = club.members?.length || 0;

    let personalContext = null;
    if(req.user){
        const studentId = req.user._id.toString();
        const isJoined = club.members.some(id => id.toString() === studentId);
        const isPresident = club.president?._id.toString() === studentId;
        const isVicePresident = club.vicePresident?._id.toString() === studentId;
        const isAdvisor = club.advisors.some(advisor => advisor._id.toString() === studentId);

        personalContext = {
            isJoined,
            isPresident,
            isVicePresident,
            isAdvisor,
            role: isPresident ? "president"
                : isVicePresident ? "vicePresident"
                : isAdvisor ? "advisor"
                : isJoined ? "member"
                : null
        }
    }

    const publicClub = {
        _id: club._id,
        name: club.name,
        description: club.description,
        department: club.department,
        president: club.president,
        advisors: club.advisors,
        status: club.status,
        tags: club.tags || { predefined: [], custom: [] },
        memberCount,
        createdAt: club.createdAt
    }

    return res.status(200).json(new ApiResponse(200, { club: publicClub, upcomingEvents, ...(personalContext && { personalContext }) }, "Club profile retrieved successfully"));
})

export { getClubProfile };