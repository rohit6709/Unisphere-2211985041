import mongoose from "mongoose";
import { Club } from "../models/club.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyClubAccess = asyncHandler(async (req, res, next) => {
    const { clubId } = req.params;
    if(!clubId){
        throw new ApiError(400, "Club ID is required");
    }
    if(!mongoose.Types.ObjectId.isValid(clubId)){
        throw new ApiError(400, "Invalid Club ID");
    }

    const club = await Club.findById(clubId)
        .populate("advisors", "_id")
        .populate("president", "_id")
        .populate("vicePresident", "_id");
    if(!club){
        throw new ApiError(404, "Club not found");
    }
    if(club.status !== "active"){
        throw new ApiError(403, "Club is not active");
    }

    const userId = req.user._id.toString();

    if(["admin", "superadmin"].includes(req.user.role)){
        req.club = club;
        req.clubRole = "admin";
        return next();
    }

    // HOD can access clubs within their own department for governance/review workflows.
    if(
        req.user.role === "hod" &&
        req.user.department &&
        club.department &&
        req.user.department.toString().trim().toLowerCase() === club.department.toString().trim().toLowerCase()
    ){
        req.club = club;
        req.clubRole = "hod";
        return next();
    }

    if(club.president?._id.toString() === userId){
        req.club = club;
        req.clubRole = "president";
        return next();
    }

    if(club.vicePresident?._id.toString() === userId){
        req.club = club;
        req.clubRole = "vicePresident";
        return next();
    }

    const isAdvisor = club.advisors.some(advisor => advisor._id.toString() === userId);
    if(isAdvisor){
        req.club = club;
        req.clubRole = "advisor";
        return next();
    }

    const isMember = club.members.some(member => member.toString() === userId);
    if(isMember){
        req.club = club;
        req.clubRole = "member";
        return next();
    }

    throw new ApiError(403, "You do not have access to this club");
})

export const requireClubRole = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.clubRole){
            throw new ApiError(500, "Club role not set. Ensure verifyClubAccess middleware is used before this middleware.");
        }
        if(!allowedRoles.includes(req.clubRole)){
            throw new ApiError(403, "You do not have the required role to perform this action");
        }
        next();
    }
}
