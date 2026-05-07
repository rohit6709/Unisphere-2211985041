import { Notice } from '../models/notice.model.js';
import { Club } from '../models/club.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const resolvePostedByModel = (role) => {
    if (["admin", "superadmin"].includes(role)){
        return "Admin";
    }
    if (["faculty", "hod"].includes(role)){
        return "Faculty";
    }
    return "Student";
};

const createNotice = asyncHandler(async (req, res) => {
    const {
        title,
        content,
        targetAudience = "all",
        targetDepartment,
        targetClub,
        expiresAt,
        priority = "medium",
    } = req.body;
 
    if(!title){
        throw new ApiError(400, "Notice title is required");
    }
    if(!content){
        throw new ApiError(400, "Notice content is required");
    }
 
    if(targetAudience === "department" && !targetDepartment) {
        throw new ApiError(400, "Target department is required when audience is 'department'");
    }
 
    if (targetAudience === "club") {
        if (!targetClub) {
            throw new ApiError(400, "Target club is required when audience is 'club'");
        }
        const club = await Club.findById(targetClub);
        if (!club){
            throw new ApiError(404, "Target club not found");
        }
        if(req.user.role === "club_president") {
            const isPresidentOfClub =
                club.president?.toString() === req.user._id.toString();
            if (!isPresidentOfClub) {
                throw new ApiError(403, "You can only post notices to your own club");
            }
        }
    }
 
    if (expiresAt && new Date(expiresAt) <= new Date()) {
        throw new ApiError(400, "Expiry date must be in the future");
    }
 
    let attachment = { url: null, filename: null, mimetype: null };
    if (req.file) {
        attachment = {
            url: req.file.path,
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
        };
    }
 
    const notice = await Notice.create({
        title: title.trim(),
        content: content.trim(),
        postedBy: req.user._id,
        postedByModel: resolvePostedByModel(req.user.role),
        postedByRole: req.user.role,
        targetAudience,
        targetDepartment: targetAudience === "department" ? targetDepartment : null,
        targetClub: targetAudience === "club" ? targetClub : null,
        attachment,
        expiresAt: expiresAt || null,
        priority,
    });
 
    const populated = await Notice.findById(notice._id)
        .populate("postedBy", "name email")
        .populate("targetClub", "name department");
 
    return res
        .status(201)
        .json(new ApiResponse(201, populated, "Notice created successfully"));
});

const updateNotice = asyncHandler(async (req, res) => {
    const { noticeId } = req.params;
    const allowedFields = ["title", "content", "expiresAt", "priority", "isActive"];
    const { forceExpire } = req.body;
 
    const notice = await Notice.findById(noticeId);
    if(!notice){
        throw new ApiError(404, "Notice not found");
    }
 
    // ─── Only poster or admin can update ─────────────────────────────────────
    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    const isPoster = notice.postedBy.toString() === req.user._id.toString();
 
    if(!isAdmin && !isPoster){
        throw new ApiError(403, "You can only update your own notices");
    }
 
    const updates = {};
    for (const field of allowedFields) {
        if(req.body[field] !== undefined){
            updates[field] = req.body[field];
        }
    }
 
    if(!Object.keys(updates).length){
        if(!forceExpire){
            throw new ApiError(400, "No valid fields provided to update");
        }
    }

    if(forceExpire){
        updates.expiresAt = new Date();
        updates.isActive = false;
    }

    if(updates.expiresAt && !forceExpire && new Date(updates.expiresAt) <= new Date()){
        throw new ApiError(400, "Expiry date must be in the future");
    }
 
    if(updates.title){
        updates.title = updates.title.trim();
    }
    if(updates.content){
        updates.content = updates.content.trim();
    }
 
    const updated = await Notice.findByIdAndUpdate(
        noticeId,
        { $set: updates },
        { new: true, runValidators: true }
    )
        .populate("postedBy", "name email")
        .populate("targetClub", "name department");
 
    return res
        .status(200)
        .json(new ApiResponse(200, updated, "Notice updated successfully"));
});

const deleteNotice = asyncHandler(async (req, res) => {
    const { noticeId } = req.params;
 
    const notice = await Notice.findById(noticeId);
    if(!notice){
        throw new ApiError(404, "Notice not found");
    }
 
    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    const isPoster = notice.postedBy.toString() === req.user._id.toString();
 
    if(!isAdmin && !isPoster){
        throw new ApiError(403, "You can only delete your own notices");
    }
 
    await Notice.findByIdAndDelete(noticeId);
 
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Notice deleted successfully"));
});

const getAllNotices = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        targetAudience,
        targetDepartment,
        priority,
        search,
        isActive,
    } = req.query;
 
    const filter = {};
    if(targetAudience){
        filter.targetAudience = targetAudience;
    }
    if(targetDepartment){
        filter.targetDepartment = targetDepartment;
    }
    if(priority){
        filter.priority = priority;
    }
    if(isActive !== undefined){
        filter.isActive = isActive === "true";
    }
    if(search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { content: { $regex: search, $options: "i" } },
        ];
    }
 
    const skip = (Number(page) - 1) * Number(limit);
 
    const notices = await Notice.find(filter)
        .populate("postedBy", "name email")
        .populate("targetClub", "name department")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
    const total = await Notice.countDocuments(filter);
 
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notices,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
            "Notices fetched successfully"
        )
    );
});

const getMyNotices = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, priority } = req.query;
    const now = new Date();
 
    const audienceFilter = [
        { targetAudience: "all" },
    ];
 
    if(req.user.department){
        audienceFilter.push({
            targetAudience: "department",
            targetDepartment: req.user.department,
        });
    }
 
    if (["student", "club_president", "club_vice_president"].includes(req.user.role)) {
        const { Club } = await import("../models/club.model.js");
        const userClubs = await Club.find({ members: req.user._id }).select("_id");
        const clubIds = userClubs.map((c) => c._id);
 
        if (clubIds.length) {
            audienceFilter.push({
                targetAudience: "club",
                targetClub: { $in: clubIds },
            });
        }
    }
 
    const filter = {
        $or: audienceFilter,
        isActive: true,
        $and: [
            {
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: now } },    // not expired
                ],
            },
        ],
    };
 
    if (priority) filter.priority = priority;
 
    const skip = (Number(page) - 1) * Number(limit);
 
    const [notices, total] = await Promise.all([
        Notice.find(filter)
            .populate("postedBy", "name email")
            .populate("targetClub", "name")
            .sort({ priority: -1, createdAt: -1 })  // urgent first
            .skip(skip)
            .limit(Number(limit)),
        Notice.countDocuments(filter),
    ]);
 
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notices,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
            "Notices fetched successfully"
        )
    );
});

const getNotice = asyncHandler(async (req, res) => {
    const { noticeId } = req.params;
 
    const notice = await Notice.findById(noticeId)
        .populate("postedBy", "name email role")
        .populate("targetClub", "name department");
 
    if (!notice) throw new ApiError(404, "Notice not found");
 
    return res
        .status(200)
        .json(new ApiResponse(200, notice, "Notice fetched successfully"));
});

const getMyPostedNotices = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
 
    const [notices, total] = await Promise.all([
        Notice.find({ postedBy: req.user._id })
            .populate("targetClub", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Notice.countDocuments({ postedBy: req.user._id }),
    ]);
 
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notices,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
            "Your posted notices fetched successfully"
        )
    );
});

export { createNotice, updateNotice, deleteNotice, getAllNotices, getMyNotices, getNotice, getMyPostedNotices };
