import { Student } from '../models/student.model.js';
import { Club } from '../models/club.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

import {
    INTEREST_CATEGORIES,
    MATCH_WEIGHTS,
    MIN_MATCH_SCORE,
    CUSTOM_TAG_MAX_LENGTH,
    CUSTOM_TAG_MAX_COUNT
} from '../constants/interests.js';


// helper function

const sanitizeCustomTag = (tag) => {
    if(typeof tag !== 'string') return null;
    const cleaned = tag.toLowerCase().trim().replace(/[^a-z0-9_\s]/g, "").replace(/\s+/g, "_").slice(0, CUSTOM_TAG_MAX_LENGTH);

    return cleaned.length > 0 ? cleaned : null;
}

const validatePredefinedInterests = (interests) => {
    if(!Array.isArray(interests)){
        return [];
    }
    return interests.filter(i => INTEREST_CATEGORIES.includes(i));
}

const computeMatchScore = (studentInterests, clubTags) => {
    const predefinedMatches = studentInterests.predefined.filter(
        i => clubTags.predefined.includes(i)
    );
    const studentCustomLower = studentInterests.custom.map(t => t.toLowerCase());
    const clubCustomLower = clubTags.custom.map(t => t.toLowerCase());
    const customMatches = studentCustomLower.filter(t => clubCustomLower.includes(t));
 
    return {
        score: predefinedMatches.length * MATCH_WEIGHTS.predefined
             + customMatches.length * MATCH_WEIGHTS.custom,
        matchedPredefined: predefinedMatches,
        matchedCustom: customMatches
    };
};

const getClubRecommendationsForStudent = async (interests, studentId) => {
    const clubs = await Club.find({
        status: 'active',
        members: { $ne: studentId },
        $or: [
            { 'tags.predefined': { $exists:  true, $ne: [] } },
            { 'tags.custom': { $exists:  true, $ne: [] } }
        ]
    })
    .populate('president', 'name rollNo')
    .populate('advisors', 'name employeeId department')
    .select('name description department tags president advisors members')
    .lean();

    const scored = clubs.map(club => {
        const { score, matchedPredefined, matchedCustom } = computeMatchScore(interests, { predefined: club.tags?.predefined || [], custom: club.tags?.custom || [] });
        return { club, score, matchedPredefined, matchedCustom };
    })
    .filter(r => r.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score);

    return scored.map(({ club, score, matchedPredefined, matchedCustom }) => {
        const { members, ...clubData } = club;
        return {
            ...clubData,
            memberCount: members?.length || 0,
            matchScore: score,
            matchedInterests: { predefined: matchedPredefined, custom: matchedCustom }
        }
    })
}


const saveInterests = asyncHandler(async (req, res) => {
    const { predefinedInterests = [], customInterests = [] } = req.body;

    const validPredefined = validatePredefinedInterests(predefinedInterests);
    const validCustom = customInterests.map(sanitizeCustomTag).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, CUSTOM_TAG_MAX_COUNT);

    if(validPredefined.length === 0 && validCustom.length === 0){
      throw new ApiError(400, "Please provide at least one interest");  
    }

    const student = await Student.findByIdAndUpdate(
        req.user._id,
        {
            interests: { predefined: validPredefined, custom: validCustom },
            isOnboarded: true
        },{ new: true }
    ).select("name interests isOnboarded");

    const recommendations = await getClubRecommendationsForStudent(
        { predefined: validPredefined, custom: validCustom },
        req.user._id
    )

    return res.status(200).json(new ApiResponse(200, {
        student,
        recommendations,
        savedInterests: {
            predefined: validPredefined,
            custom: validCustom,
            total: validPredefined.length + validCustom.length
        }
    }, "Interests saved successfully and club recommendations generated"));
})

const getClubRecommendations = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.user._id).select("interests");

    if(!student.interests?.predefined?.length && !student.interests?.custom?.length){
        throw new ApiError(400, "Please save your interests first to get recommendations");
    }

    const recommendations = await getClubRecommendationsForStudent(
        student.interests,
        req.user._id
    )

    return res.status(200).json(new ApiResponse(200, { recommendations }, "Club recommendations retrieved successfully"));
})


const updateInterests = asyncHandler(async (req, res) => {
    const { predefinedInterests, customInterests } =req.body;
    const updates = {};

    if(predefinedInterests !== undefined){
        updates['interests.predefined'] = validatePredefinedInterests(predefinedInterests);
    }
    if(customInterests !== undefined){
        updates["interests.custom"] = customInterests
            .map(sanitizeCustomTag)
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .slice(0, CUSTOM_TAG_MAX_COUNT);
    }

    if(!Object.keys(updates).length){
        throw new ApiError(400, "No valid interests provided for update");
    }

    const student = await Student.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true }
    ).select("interests");

    return res.status(200).json(new ApiResponse(200, student, "Interests updated successfully"));
})

const getInterestCategories = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, {
        categories: INTEREST_CATEGORIES,
        maxCustomTags: CUSTOM_TAG_MAX_COUNT,
        maxCustomTagLength: CUSTOM_TAG_MAX_LENGTH
    }, "Interest categories retrieved successfully"));
})

export {
    saveInterests,
    getClubRecommendations,
    updateInterests,
    getInterestCategories
}