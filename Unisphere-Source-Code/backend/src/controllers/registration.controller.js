import mongoose from 'mongoose';
import { Event } from '../models/event.model.js';
import { Registration } from '../models/registration.model.js';
import { EventGroup } from '../models/eventGroup.model.js';
import { Club } from '../models/club.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitSystemMessage } from '../sockets/chat.socket.js';
import { notificationService } from '../services/notificationService.js';
import { clearCache } from '../middlewares/cache.middleware.js';

const validateObjectId = (id, label = "ID") => {
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(400, `${label} is not a valid ObjectId`);
    }
};

const VALID_ADMIN_REGISTRATION_STATUSES = ["registered", "cancelled", "attended", "no_show"];

const registerForEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findById(eventId).populate("club", "_id");
    if(!event){
        throw new ApiError(404, "Event not found");
    }
    if(!["approved", "live"].includes(event.status)){
        throw new ApiError(400, "Event is not open for registration");
    }

    if(new Date() > new Date(event.registrationDeadline)){
        throw new ApiError(400, "Registration deadline has passed");
    }

    const activeCount = await Registration.countDocuments({
        event: eventId,
        status: "registered"
    })
    if(activeCount >= event.maxParticipants){
        throw new ApiError(400, "Event is full");
    }
    if(event.visibility === "club_only"){
        const isMember = await Club.exists({
            _id: event.club._id,
            members: req.user._id
        })
        if(!isMember){
            throw new ApiError(403, "This event is only open to club members only");
        }
    }

    let registration;
    try{
        registration = await Registration.create({
            event: eventId,
            student: req.user._id,
            club: event.club._id,
            status: "registered",
            registeredAt: new Date()
        })
    }
    catch(err){
        if(err.code === 11000){
            const existing = await Registration.findOne({
                event: eventId,
                student: req.user._id
            })
            if(existing?.status === "cancelled"){
                existing.status = "registered";
                existing.registeredAt = new Date();
                existing.cancelledAt = null;
                await existing.save();
                registration = existing;
            }
            else{
                throw new ApiError(400, "You have already registered for this event");
            }
        }
        else{
            throw err;
        }
    }

    const group = await EventGroup.findOne({
        event: eventId,
        status: "active"
    });
    if(group){
        const alreadyInGroup = group.members.some(m => m.user.toString() === req.user._id.toString());
        if(!alreadyInGroup){
            group.members.push({
                user: req.user._id,
                userModel: "Student",
                role: "member",
                joinedAt: new Date()
            })
            await group.save();

            emitSystemMessage({
                roomType: "EventGroup",
                roomId: group._id.toString(),
                content: `${req.user.name} joined the group`,
            }).catch(err => 
                console.error("Failed to emit system message for new group member:", err.message)
            )
        }
    }

    const spotsRemaining = event.maxParticipants - (activeCount + 1);

    notificationService.notifyRegistrationConfirmed({
        eventTitle: event.title,
        recipients: [{ id: req.user._id, model: "Student" }],
        data: { eventId: eventId.toString(), clubId: event.club._id.toString() }
    }).catch(err => console.error("Failed to send registration confirmation notification", err));

    // Invalidate cached event detail/list so "Spots Available" refreshes immediately
    clearCache(`/events/public/${eventId}`);
    clearCache('/events/public');

    return res.status(201)
        .json(new ApiResponse(201, { registrationId: registration._id, eventId, spotsRemaining: Math.max(0, spotsRemaining), groupJoined: !!group }, "Successfully registered for event"));
})

const unregisterFromEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findById(eventId).select("status registrationDeadline");
    if(!event){
        throw new ApiError(404, "Event not found");
    }
    if(!["approved", "live"].includes(event.status)){
        throw new ApiError(400, "Cannot unregister from this event");
    }
    if(new Date() > new Date(event.registrationDeadline)){
        throw new ApiError(400, "Registration deadline has passed - cannot unregister");
    }

    const registration = await Registration.findOne({
        event: eventId,
        student: req.user._id,
        status: "registered"
    });
    if(!registration){
        throw new ApiError(404, "You are not registered for this event");
    }

    registration.status = "cancelled";
    registration.cancelledAt = new Date();
    await registration.save();

    await EventGroup.findOneAndUpdate(
        { event: eventId, status: "active" },
        { $pull: { members: { user: req.user._id } } }
    )

    // Invalidate cached event detail/list so "Spots Available" refreshes immediately
    clearCache(`/events/public/${eventId}`);
    clearCache('/events/public');

    return res.status(200)
        .json(new ApiResponse(200, {}, "Successfully unregistered from event"));
})

const getEventRegistrations = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const { page = 1, limit = 20, status, search } = req.query;

    const event = await Event.findById(eventId).populate("club", "advisors");
    if(!event){
        throw new ApiError(404, "Event not found");
    }

    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    if(!isAdmin){
        const isAdvisor = event.club.advisors.some(a => a.toString() === req.user._id.toString());
        if(!isAdvisor){
            throw new ApiError(403, "Only admins and club advisors can view registrations");
        }
    }

    const filter = { event: eventId };
    if(status){
        filter.status = status;
    }
    const skip = Number((page) - 1) * Number(limit);

    let registrations, total;
    if(search){
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "students",
                    localField: "student",
                    foreignField: "_id",
                    as: "studentData"
            }
        },
        { $unwind: "$studentData" },
        {
            $match: {
                $or: [
                    { "studentData.name": { $regex: search, $options: "i" } },
                    { "studentData.rollNo": { $regex: search, $options: "i" } }
                ]
            }
        },
        {
            $project: {
                event: 1, club: 1, status: 1, registeredAt: 1, cancelledAt: 1,
                student: {
                    _id: "$studentData._id",
                    name: "$studentData.name",
                    email: "$studentData.email",
                    rollNo: "$studentData.rollNo",
                    department: "$studentData.department"
                }
            }
        },
        { $sort: { registeredAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) }
        ]

        const countPipeline = pipeline.slice(0, 4); 
        countPipeline.push({ $count: "total" });
        
        const [results, countResult] = await Promise.all([
            Registration.aggregate(pipeline),
            Registration.aggregate(countPipeline)
        ])

        registrations = results;
        total = countResult[0]?.total || 0;
    }
    else{
        [registrations, total] = await Promise.all([
            Registration.find(filter)
                .populate("student", "name email rollNo department")
                .sort({ registeredAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Registration.countDocuments(filter)
        ])
    }

    const summary = await Registration.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(eventId) } },
        { $group: {
            _id: "$status",
            count: { $sum: 1 }
        } }
    ])

    const statusSummary = summary.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
    }, {});

    return res.status(200)
        .json(new ApiResponse(200, {
            registrations,
            summary: statusSummary,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        }, "Event registrations retrieved successfully"));        
})

const getMyRegistrations = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    const filter = {
        student: req.user._id,
        status: status || "registered"
    }

    const skip = Number((page) - 1) * Number(limit);

    const [registrations, total] = await Promise.all([
        Registration.find(filter)
            .populate({
                path: "event",
                select: "title eventType status startsAt endsAt venue maxParticipants posterUrl club",
                populate: { path: "club", select: "name department" }
            })
            .sort({ registeredAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Registration.countDocuments(filter)
    ])

    return res.status(200)
        .json(new ApiResponse(200, {
            registrations,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
                }
            }, "Your registrations retrieved successfully"));
})

const getAllRegistrations = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, search, eventId } = req.query;
    const filter = {};
    if(status) filter.status = status;
    if (eventId) {
        validateObjectId(eventId, "event ID");
        filter.event = new mongoose.Types.ObjectId(eventId);
    }

    const skip = Number((page) - 1) * Number(limit);

    let registrations, total;
    if(search){
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "students",
                    localField: "student",
                    foreignField: "_id",
                    as: "studentData"
                }
            },
            { $unwind: "$studentData" },
            {
                $match: {
                    $or: [
                        { "studentData.name": { $regex: search, $options: "i" } },
                        { "studentData.rollNo": { $regex: search, $options: "i" } }
                    ]
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
            { $unwind: "$eventData" },
            {
                $project: {
                    status: 1, registeredAt: 1,
                    student: {
                        name: "$studentData.name",
                        rollNo: "$studentData.rollNo",
                        email: "$studentData.email"
                    },
                    event: {
                        _id: "$eventData._id",
                        title: "$eventData.title",
                        startsAt: "$eventData.startsAt"
                    }
                }
            },
            { $sort: { registeredAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) }
        ];

        const [results, countResult] = await Promise.all([
            Registration.aggregate(pipeline),
            Registration.aggregate([...pipeline.slice(0, 4), { $count: "total" }])
        ]);

        registrations = results;
        total = countResult[0]?.total || 0;
    } else {
        [registrations, total] = await Promise.all([
            Registration.find(filter)
                .populate("student", "name rollNo email")
                .populate("event", "title startsAt")
                .sort({ registeredAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Registration.countDocuments(filter)
        ]);
    }

    return res.status(200).json(new ApiResponse(200, {
        registrations,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
    }, "Global registrations retrieved successfully"));
});

const updateRegistrationStatus = asyncHandler(async (req, res) => {
    const { eventId, registrationId } = req.params;
    const { status } = req.body;

    validateObjectId(eventId, "event ID");
    validateObjectId(registrationId, "registration ID");

    if (!VALID_ADMIN_REGISTRATION_STATUSES.includes(status)) {
        throw new ApiError(400, "Invalid registration status");
    }

    const registration = await Registration.findOne({ _id: registrationId, event: eventId }).populate("student", "name rollNo");
    if (!registration) {
        throw new ApiError(404, "Registration not found for this event");
    }

    registration.status = status;
    if (status === "cancelled") {
        registration.cancelledAt = new Date();
    } else {
        registration.cancelledAt = null;
    }
    await registration.save();

    return res.status(200).json(
        new ApiResponse(200, registration, `Registration status updated to ${status}`)
    );
});

const bulkUpdateRegistrationStatus = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { registrationIds, status } = req.body;

    validateObjectId(eventId, "event ID");

    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
        throw new ApiError(400, "registrationIds must be a non-empty array");
    }
    if (!VALID_ADMIN_REGISTRATION_STATUSES.includes(status)) {
        throw new ApiError(400, "Invalid registration status");
    }

    const validRegistrationIds = registrationIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validRegistrationIds.length) {
        throw new ApiError(400, "No valid registration IDs were provided");
    }

    const update = {
        status,
        cancelledAt: status === "cancelled" ? new Date() : null,
    };

    const result = await Registration.updateMany(
        { _id: { $in: validRegistrationIds }, event: eventId },
        { $set: update }
    );

    return res.status(200).json(
        new ApiResponse(200, { matched: result.matchedCount, modified: result.modifiedCount }, `Updated ${result.modifiedCount} registrations`)
    );
});

const exportRegistrations = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findById(eventId).populate("club", "advisors name");
    if(!event){
        throw new ApiError(404, "Event not found");
    }

    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    if(!isAdmin){
        const isAdvisor = event.club.advisors.some(a => a.toString() === req.user._id.toString());
        if(!isAdvisor){
            throw new ApiError(403, "You do not have permission to export these registrations");
        }
    }

    const registrations = await Registration.find({ event: eventId, status: "registered" })
        .populate("student", "name rollNo email department")
        .sort({ registeredAt: 1 });

    const csvData = registrations.map(reg => ({
        "Student Name": reg.student.name,
        "Roll Number": reg.student.rollNo,
        "Email": reg.student.email,
        "Department": reg.student.department,
        "Registration Date": new Date(reg.registeredAt).toLocaleDateString()
    }));

    const { Parser } = await import('json2csv');
    const parser = new Parser();
    const csv = parser.parse(csvData);

    const filename = `${event.title.replace(/\s+/g, '_')}_Attendees.csv`;

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);
})

export {
    registerForEvent,
    unregisterFromEvent,
    getEventRegistrations,
    getMyRegistrations,
    getAllRegistrations,
    exportRegistrations,
    updateRegistrationStatus,
    bulkUpdateRegistrationStatus
}
