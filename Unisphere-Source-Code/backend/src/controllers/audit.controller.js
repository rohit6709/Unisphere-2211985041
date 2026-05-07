import { ApprovalLog } from "../models/approvalLog.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ACTION_TYPE_MAP = {
    create: ["created", "submitted", "resubmitted"],
    update: ["featured", "conflict_flagged", "auto_live", "auto_completed", "auto_archived"],
    delete: ["cancelled"],
    approve: ["approved"],
    reject: ["rejected"],
};

const buildAuditFilter = ({ action, actionType, startDate, endDate }) => {
    const filter = {};

    if (action) {
        filter.action = action;
    } else if (actionType && ACTION_TYPE_MAP[actionType]) {
        filter.action = { $in: ACTION_TYPE_MAP[actionType] };
    }

    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    return filter;
};

const getGlobalAuditLogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, action, actionType, search, startDate, endDate } = req.query;
    const filter = buildAuditFilter({ action, actionType, startDate, endDate });

    const skip = (Number(page) - 1) * Number(limit);

    // If search is provided, we need to populate and then filter, or use a pipeline
    let logs, total;
    
    if (search) {
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "admins",
                    localField: "performedBy",
                    foreignField: "_id",
                    as: "adminData"
                }
            },
            {
                $lookup: {
                    from: "faculties",
                    localField: "performedBy",
                    foreignField: "_id",
                    as: "facultyData"
                }
            },
            {
                $lookup: {
                    from: "students",
                    localField: "performedBy",
                    foreignField: "_id",
                    as: "studentData"
                }
            },
            {
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "eventData"
                }
            },
            {
                $lookup: {
                    from: "clubs",
                    localField: "club",
                    foreignField: "_id",
                    as: "clubData"
                }
            },
            {
                $match: {
                    $or: [
                        { "adminData.name": { $regex: search, $options: "i" } },
                        { "facultyData.name": { $regex: search, $options: "i" } },
                        { "studentData.name": { $regex: search, $options: "i" } },
                        { "eventData.title": { $regex: search, $options: "i" } },
                        { "clubData.name": { $regex: search, $options: "i" } },
                        { action: { $regex: search, $options: "i" } }
                    ]
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) }
        ];

        const [results, countResult] = await Promise.all([
            ApprovalLog.aggregate(pipeline),
            ApprovalLog.aggregate([...pipeline.slice(0, pipeline.length - 3), { $count: "total" }])
        ]);

        // Manually populate since aggregate doesn't do it automatically
        logs = await ApprovalLog.populate(results, [
            { path: "event", select: "title" },
            { path: "club", select: "name" },
            { path: "performedBy", select: "name email role" }
        ]);
        total = countResult[0]?.total || 0;
    } else {
        [logs, total] = await Promise.all([
            ApprovalLog.find(filter)
                .populate("event", "title")
                .populate("club", "name")
                .populate("performedBy", "name email role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            ApprovalLog.countDocuments(filter)
        ]);
    }

    return res.status(200).json(new ApiResponse(200, {
        logs,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }
    }, "Global audit logs fetched successfully"));
});

const exportGlobalAuditLogs = asyncHandler(async (req, res) => {
    const { action, actionType, search, startDate, endDate } = req.query;
    const filter = buildAuditFilter({ action, actionType, startDate, endDate });

    let logs = await ApprovalLog.find(filter)
        .populate("event", "title")
        .populate("club", "name")
        .populate("performedBy", "name email role")
        .sort({ createdAt: -1 })
        .limit(5000);

    if (search) {
        const normalized = search.toLowerCase();
        logs = logs.filter((log) => {
            const haystack = [
                log?.performedBy?.name,
                log?.performedBy?.email,
                log?.event?.title,
                log?.club?.name,
                log?.action,
                log?.reason,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(normalized);
        });
    }

    const rows = logs.map((log) => ({
        timestamp: log.createdAt?.toISOString?.() || "",
        user: log.performedBy?.name || "System",
        userEmail: log.performedBy?.email || "",
        action: log.action,
        resource: log.event?.title || log.club?.name || "",
        club: log.club?.name || "",
        fromStatus: log.fromStatus || "",
        toStatus: log.toStatus || "",
        details: log.reason || "",
    }));

    const { Parser } = await import("json2csv");
    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("audit_logs.csv");
    return res.send(csv);
});

export { getGlobalAuditLogs, exportGlobalAuditLogs };
