import { Club } from '../models/club.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { INTEREST_CATEGORIES, CUSTOM_TAG_MAX_LENGTH, CUSTOM_TAG_MAX_COUNT } from '../constants/interests.js';

const sanitizeCustomTag = (tag) => {
    if(typeof tag !== 'string') return null;
    const cleaned = tag.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '_')
        .slice(0, CUSTOM_TAG_MAX_LENGTH); // Limit length

        return cleaned.length > 0 ? cleaned : null;
}

const updateClubTags = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    const { predefinedTags = [], customTags = [] } = req.body;

    const validPredefined = predefinedTags.filter(tag => INTEREST_CATEGORIES.includes(tag));

    const validCustom = customTags.map(sanitizeCustomTag).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, CUSTOM_TAG_MAX_COUNT);

    const updatedClub = await Club.findByIdAndUpdate(
        clubId,
        { $set: { tags: { predefined: validPredefined, custom: validCustom } } },
        { new: true, runValidators: true }
    ).select("name tags");

    if(!updatedClub){
        throw new ApiError(404, 'Club not found');
    }

    return res.status(200).json(new ApiResponse(200, updatedClub, 'Club tags updated successfully'));
})

const getClubTags = asyncHandler(async (req, res) => {
    const { clubId } = req.params;
    
    const club = await Club.findById(clubId).select("name tags");
    if(!club){
        throw new ApiError(404, 'Club not found');
    }

    return res.status(200).json(new ApiResponse(200, {
        tags: club.tags || { predefined: [], custom: [] }
    }, 'Club tags retrieved successfully'));
})

export { updateClubTags, getClubTags };