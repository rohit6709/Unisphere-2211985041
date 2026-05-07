import cron from 'node-cron';
import mongoose, { model } from 'mongoose';
import { Event } from '../models/event.model.js';
import { Club } from '../models/club.model.js';
import { Registration } from '../models/registration.model.js';
import { EventGroup } from '../models/eventGroup.model.js';
import { ApprovalLog } from '../models/approvalLog.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scheduleGroupDissolution, cancelGroupDissolution, scheduleGroupClosingWarning, cancelGroupClosingWarning } from '../queues/queue.js';
import{ notificationService } from '../services/notificationService.js';
import { clearCache } from '../middlewares/cache.middleware.js';

const createLog = async ({
    eventId,
    clubId,
    action,
    performedBy = null,
    performedByModel = null,
    fromStatus = null,
    toStatus = null,
    reason = null,
    metadata = null
}) => {
    try {
        await ApprovalLog.create({
            event: eventId,
            club: clubId,
            action,
            performedBy,
            performedByModel,
            fromStatus,
            toStatus,
            reason,
            metadata
        })
    } catch (error) {
        console.error(`[AUDIT_LOG] Failed to log ${action} for event ${eventId}: `, error.message);
    }
}

const detectConflicts = async (event, excludeId = null) => {
    const filter = {
        "venue.name": event.venue.name,
        status: { $in: ["approved", "live"] },
        startsAt: { $lt: event.endsAt },
        endsAt: { $gt: event.startsAt }
    };
    if(excludeId){
        filter._id = { $ne: excludeId };
    }

    return await Event.findOne(filter).populate("club", "name").select("title startsAt endsAt club") || null;
}

const validateEventDates = (startsAt,endsAt, registrationDeadline, checkFuture = true) => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const deadline = new Date(registrationDeadline);

    if(isNaN(start) || isNaN(end) || isNaN(deadline)){
        throw new ApiError(400, "Invalid date format");
    }
    if(checkFuture && start < new Date()){
        throw new ApiError(400, "Event start time must be in the future");
    }
    if(start >= end){
        throw new ApiError(400, "Event start time must be before end time");
    }
    if(deadline >= start){
        throw new ApiError(400, "Registration deadline must be before event start time");
    }
    return { start, end, deadline };
}

const resolvePerformerModel = (role) => {
    if(["admin", "superadmin"].includes(role)){
        return "Admin";
    }
    if(["faculty", "hod"].includes(role)){
        return "Faculty";
    }
    return "Student";
}

const validateObjectId = (id, label = "ID") => {
    if(!mongoose.Types.ObjectId.isValid(id)){
        throw new ApiError(400, `Invalid ${label} format`);
    }
}

const fetchPendingEventsForFilter = async (filter, skip, limit) => {
    const baseQuery = Event.find(filter)
        .populate("club", "name department")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(Number(limit));

    try {
        return await baseQuery.clone().populate("submittedBy", "name rollNo employeeId");
    } catch (error) {
        // Legacy records can have missing/invalid submittedByModel or broken club refs.
        // Fall back in stages so one bad document does not take down the whole approval queue.
        console.error("[EVENT_PENDING] populate failed, falling back without submitter details:", error?.message);

        try {
            return await Event.find(filter)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(Number(limit));
        } catch (fallbackError) {
            console.error("[EVENT_PENDING] plain query fallback failed:", fallbackError?.message);
            return [];
        }
    }
};

// Club scoped controllers
//creates event group and auto adds president, vice president and advisors
const createEventGroup = async (event, club) => {
    try {
        const automembers = [];
        if(club.president){
            automembers.push({
                user: club.president,
                userModel: "Student",
                role: "president",
                joinedAt: new Date()
            })
        }
        if(club.vicePresident){
            automembers.push({
                user: club.vicePresident,
                userModel: "Student",
                role: "vicePresident",
                joinedAt: new Date()
            })
        }
        for(const advisorId of club.advisors){
            automembers.push({
                user: advisorId,
                userModel: "Faculty",
                role: "advisor",
                joinedAt: new Date()
            })
        }

        const group = await EventGroup.create({
            event: event._id,
            club: club._id,
            name: `${event.title} - Group`,
            members: automembers,
            status: "active"
        })

        console.log(`Created event group ${group._id} for event ${event._id}`);
        return group;
    } catch (error) {
        if(error.code === 11000){
            return await EventGroup.findOne({ event: event._id });
        }
        console.error(`Error creating event group for event ${event._id}:`, error.message);
        return null;
    }
}

//President, Vice president, Admin : create event
const createEvent = asyncHandler(async (req, res) => {
    const { title, description, eventType, visibility, startsAt, endsAt, duration, registrationDeadline, venue, maxParticipants, posterUrl } = req.body;
    if(!title || !description || !startsAt || !endsAt || !registrationDeadline || !venue?.name || !maxParticipants){
        throw new ApiError(400, "Missing required fields");
    }

    const { start, end, deadline } = validateEventDates(startsAt, endsAt, registrationDeadline, true);
    const performerModel = resolvePerformerModel(req.user.role);

    const event = await Event.create({
        title: title.trim(),
        description: description.trim(),
        eventType: eventType || "other",
        visibility: visibility || "club_only",
        club: req.club._id,
        submittedBy: req.user._id,
        submittedByModel: performerModel,
        startsAt: start,
        endsAt: end,
        duration: duration || Math.round((end - start) / (1000 * 60)),
        registrationDeadline: deadline,
        venue: {
            name: venue.name.trim(),
            building: venue.building? venue.building.trim() : null,
            capacity: venue.capacity || null
        },
        maxParticipants,
        posterUrl: posterUrl || null,
        status: "draft"
    });

    await createLog({
        eventId: event._id,
        clubId: req.club._id,
        action: "created",
        performedBy: req.user._id,
        performedByModel: performerModel,
        toStatus: "draft"
    });

    return res.status(201).json(new ApiResponse(201, event, "Event created as draft"));
})

//President, Vice president, admin : submit event for approval
const submitEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findOne({ _id: eventId, club: req.club._id });
    if(!event){
        throw new ApiError(404, "Event not found in this club");
    }
    if(!["draft", "rejected"].includes(event.status)){
        throw new ApiError(400, `Event cannot be submitted from ${event.status} status`);
    }

    const isResubmission = event.status === "rejected";
    const fromStatus = event.status;

    event.status = "pending_approval";
    event.rejectionReason = null;
    await event.save();

    await createLog({
        eventId: event._id,
        clubId: req.club._id,
        action: isResubmission ? "resubmitted" : "submitted",
        performedBy: req.user._id,
        performedByModel: resolvePerformerModel(req.user.role),
        fromStatus,
        toStatus: "pending_approval"
    });

    notificationService.notifyEventSubmitted({
        clubName: req.club.name,
        eventTitle: event.title,
        recipients: req.club.advisors.map(a => ({ id: a._id, model: "Faculty" })),
        data: { eventId: event._id.toString(), clubId: req.club._id.toString() }
    }).catch(err => console.error(`Failed to send event submission notification for event ${event._id}:`, err.message));

    return res.status(200).json(new ApiResponse(200, event, `Event ${isResubmission ? "resubmitted" : "submitted"} for approval`));
})

//President, Vice president, admin : update event
const updateEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const allowedFields = ["title", "description", "eventType", "visibility", "startsAt", "endsAt", "duration", "registrationDeadline", "venue", "maxParticipants", "posterUrl"];

    const updates = {};
    for(const field of allowedFields){
        if(req.body[field] !== undefined){
            updates[field] = req.body[field];
        }
    }

    if(!Object.keys(updates).length){
        throw new ApiError(400, "No valid fields provided for update");
    }
    const event = await Event.findOne({ _id: eventId, club: req.club._id });
    if(!event){
        throw new ApiError(404, "Event not found in this club");
    }
    if(!["draft", "rejected"].includes(event.status)){
        throw new ApiError(400, "Only events in draft or rejected status can be edited");
    }
    if(updates.startsAt || updates.endsAt || updates.registrationDeadline){
        validateEventDates(
            updates.startsAt ||event.startsAt,
            updates.endsAt || event.endsAt,
            updates.registrationDeadline || event.registrationDeadline,
            true
        )
    }

    if(updates.maxParticipants !== undefined){
        if(updates.maxParticipants < 1){
            throw new ApiError(400, "Max participants must be at least 1");
        }
        const currentParticipants = await Registration.countDocuments({
            event: eventId,
            status: "registered"
        })
        if(updates.maxParticipants < currentParticipants){
            throw new ApiError(400, `Cannot reduce max participants to ${updates.maxParticipants}. ` +
                `${currentParticipants} students are already registered`);
        }
    }
    if(updates.title){
        updates.title = updates.title.trim();
    }
    if(updates.description){
        updates.description = updates.description.trim();
    }
    if(updates.venue?.name){
        updates.venue.name = updates.venue.name.trim();
    }
    if(updates.venue?.building){
        updates.venue.building = updates.venue.building.trim();
    }

    if(updates.startsAt || updates.endsAt){
        const start = new Date(updates.startsAt || event.startsAt);
        const end = new Date(updates.endsAt || event.endsAt);
        updates.duration = Math.round((end - start) / (1000 * 60));
    }
    const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $set: updates },
        { new: true, runValidators: true }
    );
    return res.status(200).json(new ApiResponse(200, updatedEvent, "Event updated successfully"));
})

//Advisor, Admin : Review event, approve or reject
// on approve : create group and auto adds president/VP/advisors
const reviewEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const { action, rejectionReason, comment } = req.body;

    if(!["approve", "reject"].includes(action)){
        throw new ApiError(400, "Action must be either approve or reject");
    }

    // Find event and its club for verification
    const event = await Event.findById(eventId).populate("club");
    if(!event){
        throw new ApiError(404, "Event not found");
    }

    // Role-based authorization
    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    const isAdvisor = event.club.advisors.map(id => id.toString()).includes(req.user._id.toString());
    const isHodReviewer =
        req.user.role === "hod" &&
        req.user.department &&
        event.club?.department &&
        req.user.department.toString().trim().toLowerCase() === event.club.department.toString().trim().toLowerCase();

    if(!isAdmin && !isAdvisor && !isHodReviewer){
        throw new ApiError(403, "You do not have permission to review this event");
    }

    if(event.status !== "pending_approval"){
        throw new ApiError(400, `Event cannot be reviewed from ${event.status} status`);
    }
    const  fromStatus = event.status;
    const performerModel = resolvePerformerModel(req.user.role);

    const reviewComment = typeof comment === "string" && comment.trim() ? comment.trim() : null;

    if(action === "approve"){
        const conflict = await detectConflicts(event, event._id);
        if(conflict){
            event.hasConflict = true;
            event.conflictDetails = `Venue "${event.venue.name}" is already booked by "${conflict.title}" ` +
                `(${conflict.club?.name}) from ${conflict.startsAt.toISOString()} ` +
                `to ${conflict.endsAt.toISOString()}`;

                await createLog({
                    eventId: event._id,
                    clubId: event.club._id,
                    action: "conflict_flagged",
                    performedBy: req.user._id,
                    performedByModel: performerModel,
                    metaData: { conflictWith: conflict._id, details: event.conflictsDetails }
                });
        }
        event.status = "approved";
        event.reviewedBy = req.user._id;
        event.reviewedAt = new Date();
        event.rejectionReason = null;
        await event.save();

        const club = await Club.findById(event.club._id).select("president vicePresident advisors");

        const group = await createEventGroup(event, club);

        if(group){
            try {
                const jobId = await scheduleGroupDissolution({
                    eventGroupId: group._id.toString(),
                    eventId: event._id.toString(),
                    clubId: event.club._id.toString(),
                    endsAt: event.endsAt
                })

                const warningJobId = await scheduleGroupClosingWarning({
                     eventGroupId: group._id.toString(),
                     roomId: group._id.toString(),
                     endsAt: event.endsAt
                })

                group.dissolveJobId = jobId;
                group.closingWarningJobId = warningJobId;
                await group.save();
            } catch (error) {
                console.error(`Failed to schedule group dissolution for event ${event._id}:`, error.message);
            }
        }

        await createLog({
            eventId: event._id,
            clubId: event.club._id,
            action: "approved",
            performedBy: req.user._id,
            performedByModel: performerModel,
            fromStatus,
            toStatus: "approved",
            reason: reviewComment,
            metadata: { hasConflict: !!conflict, eventGroupId: group?._id || null }
        })
        // notify president, vp - fire and forget
        const leaderRecipients = [];
        if(club.president){
            leaderRecipients.push({ id: club.president, model: "Student" });
        }
        if(club.vicePresident){
            leaderRecipients.push({ id: club.vicePresident, model: "Student" });
        }

        if(leaderRecipients.length){
            notificationService.notifyEventApproved({
                eventTitle: event.title,
                clubName: event.club.name,
                recipients: leaderRecipients,
                data: { eventId: event._id.toString(), clubId: event.club._id.toString() }
            }).catch(err => console.error(`Failed to send event approval notification for event ${event._id}:`, err.message));
        }

        return res.status(200).json(new ApiResponse(200, { event, eventGroup: group ? { id: group._id, name: group.name, memberCount: group.members.length } : null }, conflict ? "Event approved with conflicts" : "Event approved successfully"));
    }
    else{
        const finalRejectionReason = typeof rejectionReason === "string" && rejectionReason.trim()
            ? rejectionReason.trim()
            : reviewComment;

        if(!finalRejectionReason){
            throw new ApiError(400, "Rejection reason is required when rejecting an event");
        }
        event.status = "rejected";
        event.reviewedBy = req.user._id;
        event.reviewedAt = new Date();
        event.rejectionReason = finalRejectionReason;
        await event.save();

        await createLog({
            eventId: event._id,
            clubId: event.club._id,
            action: "rejected",
            performedBy: req.user._id,
            performedByModel: performerModel,
            fromStatus,
            toStatus: "rejected",
            reason: finalRejectionReason
        });

        const clubForReject = await Club.findById(event.club._id).select("president vicePresident");
        const rejectRecipients = [];
        if(clubForReject?.president){
            rejectRecipients.push({ id: clubForReject.president, model: "Student" });
        }
        if(clubForReject?.vicePresident){
            rejectRecipients.push({ id: clubForReject.vicePresident, model: "Student" });
        }

        if(rejectRecipients.length){
            notificationService.notifyEventRejected({
                eventTitle: event.title,
                clubName: event.club.name,
                reason: finalRejectionReason,
                recipients: rejectRecipients,
                data: { eventId: event._id.toString(), clubId: event.club._id.toString() }
            }).catch(err => console.error(`Failed to send event rejection notification for event ${event._id}:`, err.message));
        }

        return res.status(200).json(new ApiResponse(200, event, "Event rejected successfully. President can edit the event details and resubmit for approval."));

    }
})

//President, VicePreident, Admin, advisor : cancel event
const cancelEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const { cancellationReason } = req.body;
    if(!cancellationReason || cancellationReason.trim() === ""){
        throw new ApiError(400, "Cancellation reason is required when cancelling an event");
    }

    const event = await Event.findById(eventId);
    if(!event){
        throw new ApiError(404, "Event not found");
    }

    if(["completed", "archived", "cancelled"].includes(event.status)){
        throw new ApiError(400, `Event cannot be cancelled from ${event.status} status`);
    }
    const fromStatus = event.status;
    const performerModel = resolvePerformerModel(req.user.role);

    event.status = "cancelled";
    event.cancellationReason = cancellationReason.trim();
    event.cancelledBy = req.user._id;
    event.cancelledByModel = performerModel;
    await event.save();

    if(["approved", "live"].includes(fromStatus)){
        const group = await EventGroup.findOne({ event: eventId });
        if(group){
            if(group.dissolveJobId){
                await cancelGroupDissolution(group.dissolveJobId);
            }
            group.status = "dissolved";
            group.dissolvedAt = new Date();
            group.dissolveJobId = null;
            await group.save();
        }
    }

    await createLog({
        eventId: event._id,
        clubId: event.club,
        action: "cancelled",
        performedBy: req.user._id,
        performedByModel: performerModel,
        fromStatus,
        toStatus: "cancelled",
        reason: cancellationReason.trim()
    })

    const registrations = await Registration.find({
        event: eventId,
        status: "registered"
    }).select("student").lean();

    if(registrations.length){
        notificationService.notifyEventCancelled({
            eventTitle: event.title,
            reason: cancellationReason.trim(),
            recipients: registrations.map(r => ({ id: r.student, model: "Student" })),
            data: { eventId: event._id.toString(), clubId: event.club.toString() }
        }).catch(err => console.error(`Failed to send event cancellation notification for event ${event._id}:`, err.message));
    }

    return res.status(200).json(new ApiResponse(200, event, "Event cancelled successfully"));
})

// Advisor, president, vice president, admin : get all events for this club
const getClubEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, eventType, search } = req.query;
    const filter = { club: req.club._id };
    if(status){
        filter.status = status;
        }
        if(eventType){
            filter.eventType = eventType;
        }
        if(search){
                filter.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } }
                ]
            }
            
            const skip = (Number(page) - 1) * Number(limit);

            const [events, total, statusSummary] = await Promise.all([
                Event.find(filter)
                    .populate("submittedBy", "name rollNo")
                    .populate("reviewedBy", "name employeeId")
                    .sort({ createdAt: -1 })
                        .skip(skip)
                        .limit(Number(limit)),
                Event.countDocuments(filter),
                Event.aggregate([
                    { $match: { club: req.club._id } },
                    { $group: { _id: "$status", count: { $sum: 1 } } },
                ])
            ])

            const summary = statusSummary.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})

            return res.status(200).json(new ApiResponse(200, { events, summary, pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }}, "Events retrieved successfully"));   
})

//Advisor, admin : get pending events
const getPendingEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const filter = { status: "pending_approval" };
    
    // Non-admins only see their advised club events
    if(!["admin", "superadmin"].includes(req.user.role)){
         const advisedClubs = await Club.find({ advisors: req.user._id }).select("_id");
         filter.club = { $in: advisedClubs.map(c => c._id) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
        fetchPendingEventsForFilter(filter, skip, limit),
        Event.countDocuments(filter)
    ])

    return res.status(200)
        .json(new ApiResponse(200, {events, pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }}, "Pending events retrieved successfully"));   
})

//Faculty advisor : get pending events for clubs they advise
const getAdviseePendingEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const filter = { status: "pending_approval" };

    if(["admin", "superadmin"].includes(req.user.role)){
        // Admin users can inspect all pending events.
    } else if(req.user.role === "hod"){
        const deptFilter = { department: req.user.department };
        const deptClubs = await Club.find(deptFilter).select("_id");
        const clubIds = deptClubs.map((club) => club._id);
        filter.club = { $in: clubIds };
    } else {
        // Faculty users only see clubs they advise.
        const advisedClubs = await Club.find({ advisors: req.user._id }).select("_id");
        const clubIds = advisedClubs.map((club) => club._id);
        filter.club = { $in: clubIds };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [eventsResult, totalResult] = await Promise.allSettled([
        fetchPendingEventsForFilter(filter, skip, limit),
        Event.countDocuments(filter)
    ])

    const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
    const total = totalResult.status === "fulfilled" ? totalResult.value : 0;

    return res.status(200)
        .json(new ApiResponse(200, {events, pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }}, "Advisee pending events retrieved successfully"));   
})

//All club roles : single event details
const getEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findById(eventId)
        .populate("submittedBy", "name rollNo employeeId")
        .populate("reviewedBy", "name employeeId")
        .populate("club", "name advisors");

        if(!event){
            throw new ApiError(404, "Event not found");
        }
        
        // Draft check
        if(event.status === "draft"){
            const isAuthorized = ["admin", "superadmin"].includes(req.user.role) || 
                                event.submittedBy.toString() === req.user._id.toString();
            if(!isAuthorized) throw new ApiError(403, "Members cannot view draft events");
        }

        return res.status(200)
            .json(new ApiResponse(200, event, "Event details retrieved successfully"));
})

//Advisor, admin : get approval log for an event
const getEventLogs = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const logs = await ApprovalLog.find({ event: eventId })
        .populate("performedBy", "name employeeId rollNo")
        .sort({ createdAt: 1 });

    return res.status(200)
        .json(new ApiResponse(200, logs, "Event logs retrieved successfully"));

})

//flat controllers

//Admin: all events across clubs all clubs
const getAllEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, clubId, eventType, visibility, search } = req.query;
    const filter = {};
    if(status){
        filter.status = status;
    }
    if(clubId){
        validateObjectId(clubId, "club ID");
        filter.club = clubId;
    }
    if(eventType){
        filter.eventType = eventType;
    }
    if(visibility){
        filter.visibility = visibility;
    }
    if(search){
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ]
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
        Event.find(filter)
            .populate("club", "name department")
            .populate("submittedBy", "name rollNo employeeId")
            .populate("reviewedBy", "name employeeId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Event.countDocuments(filter)
    ])

    return res.status(200)
        .json(new ApiResponse(200, { events, pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }}, "Events retrieved successfully"));
})

//Student see open events + club_only events for clubs they belong to
const getPublicEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, eventType, search, featured, clubId } = req.query;
    
    const studentClubs = await Club.find({ members: req.user._id }).select("_id");
    const clubIds = studentClubs.map(c => c._id);

    const filter = {
        status: { $in: ["approved", "live"] },
        $or: [
            { visibility: "open" },
            { visibility: "club_only", club: { $in: clubIds } }
        ]
    }

    // Scope to a single club when requested (e.g. club profile "Upcoming Events" panel)
    if (clubId) {
        filter.club = clubId;
    }

    if(eventType){
        filter.eventType = eventType;
    }
    if(featured === "true"){
        filter.isFeatured = true;
    }
    if(search){
        filter.$and = [{
            $or: [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ]
        }]
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
        Event.find(filter)
            .populate("club", "name department")
            .select("-conflictDetails -hasConflict")
            .sort({ isFeatured: -1, startsAt: 1 })
            .skip(skip)
            .limit(Number(limit)),
        Event.countDocuments(filter)
    ])

    return res.status(200)
        .json(new ApiResponse(200, { events, pagination: {
            total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit))
        }}, "Events retrieved successfully"));
})

//President/ Vice President: events they submitted accross clubs
const getMySubmittedEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { submittedBy: req.user._id };
    if(status){
        filter.status = status;
    }
    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
        Event.find(filter)
            .populate("club", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Event.countDocuments(filter)
    ])

    return res.status(200)
        .json(new ApiResponse(200, { events, pagination: {
            total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit))
        }}, "Submitted events retrieved successfully"));
})


const getPublicEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findOne({
        _id: eventId,
        status: { $in: ["approved", "live"] }
    }).populate("club", "name department tags members");

    if(!event){
        throw new ApiError(404, "Event not found");
    }

    // Check visibility
    if (event.visibility === "club_only") {
        const isMember = event.club.members?.map(id => id.toString()).includes(req.user._id.toString());
        if (!isMember) {
            throw new ApiError(403, "This event is exclusive to club members");
        }
    }

    // Live registration count so the frontend can show accurate "Spots Available"
    const registeredCount = await Registration.countDocuments({
        event: eventId,
        status: "registered"
    });

    const eventResponse = {
        ...event.toObject(),
        registeredCount,
        spotsRemaining: event.maxParticipants
            ? Math.max(0, event.maxParticipants - registeredCount)
            : null,
    };

    return res.status(200).json(new ApiResponse(200, eventResponse, "Event retrieved successfully"));
});

const toggleFeatured = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findById(eventId);
    if(!event){
        throw new ApiError(404, "Event not found");
    }
    if(!["approved", "live"].includes(event.status)){
        throw new ApiError(400, "Only approved or live events can be featured");
    }

    event.isFeatured = !event.isFeatured;
    await event.save();

    await createLog({
        eventId: event._id,
        clubId: event.club,
        action: "featured",
        performedBy: req.user._id,
        performedByModel: "Admin",
        metaData: { isFeatured: event.isFeatured }
    })

    return res.status(200)
        .json(new ApiResponse(200, { isFeatured: event.isFeatured }, `Event ${event.isFeatured ? "marked as featured" : "removed from featured"}`));
})

const deleteEvent = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    validateObjectId(eventId, "event ID");

    const event = await Event.findById(eventId);
    if(!event){
        throw new ApiError(404, "Event not found");
    }
    if(!["draft", "rejected"].includes(event.status)){
        throw new ApiError(400, "Only events in draft or rejected status can be deleted");
    }

    await Event.findByIdAndDelete(eventId);

    await ApprovalLog.deleteMany({ event: eventId });

    return res.status(200)
        .json(new ApiResponse(200, {}, "Event deleted successfully"));
})

const getGlobalPendingRequests = asyncHandler(async (req, res) => {
    const [clubs, events] = await Promise.all([
        Club.find({ status: "pending" }).populate("requestedBy", "name employeeId"),
        Event.find({ status: "pending_approval" }).populate("club", "name").populate("submittedBy", "name rollNo")
    ]);

    return res.status(200).json(new ApiResponse(200, { clubs, events }, "Pending requests retrieved successfully"));
});

const initEventCron = () => {
    // Approved - Live every minute
    cron.schedule("* * * * *", async () => {
        try{
            const now = new Date();
            const isActivate = await Event.find({

                status: "approved",
                startsAt: { $lte: now }
            }).select("_id club");

            for(const event of isActivate){
                await Event.findByIdAndUpdate(event._id, { status: "live" });
                await createLog({
                    eventId: event._id,
                    clubId: event.club,
                    action: "auto_live",
                    fromStatus: "approved",
                    toStatus: "live",
                })

                // notify all registered students about event going live - fire and forget
                Registration.find({ event: event._id, status: "registered" })
                    .select("student").lean()
                    .then(registrations => {
                        if(!registrations.length){
                            return;
                        }
                        return notificationService.notifyEventLive({
                            eventTitle: event.title,
                            recipients: registrations.map(r => ({ id: r.student, model: "Student" })),
                            data: { eventId: event._id.toString(), clubId: event.club.toString() }
                        })
                    })
                    .catch(err => console.error(`Failed to send event live notification for event ${event._id}:`, err.message));
            }
        }
        catch(err){
            console.error("[CRON][auto_live] failed: ", err.message);
        }
    })
    // Live - Completed every minute
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();
            const isComplete = await Event.find({
                status: "live",
                endsAt: { $lte: now }
            }).select("_id club");

            for(const event of isComplete){
                await Event.findByIdAndUpdate(event._id, { status: "completed" });
                await createLog({
                    eventId: event._id,
                    clubId: event.club,
                    action: "auto_completed",
                    fromStatus: "live",
                    toStatus: "completed",
                })
            }
        } catch (error) {
            console.error("[CRON][auto_completed] failed: ", error.message);
        }
    })
    //Completed - Archived every day at midnight
    cron.schedule("0 0 * * *", async () => {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const isArchive = await Event.find({
                status: "completed",
                endsAt: { $lte: ninetyDaysAgo }
             }).select("_id club");
            
            for(const event of isArchive){
                await Event.findByIdAndUpdate(event._id, { status: "archived" });
                await createLog({
                    eventId: event._id,
                    clubId: event.club,
                    action: "auto_archived",
                    fromStatus: "completed",
                    toStatus: "archived",
                })
            }
        } catch (error) {
            console.error("[CRON][auto_archived] failed: ", error.message);
        }
    })

    console.log("Event cron jobs initialized");
}

export {
    createEvent,
    submitEvent,
    updateEvent,
    reviewEvent,
    cancelEvent,
    getClubEvents,
    getPendingEvents,
    getEvent,
    getEventLogs,
    getAllEvents,
    getPublicEvents,
    getPublicEvent,
    getMySubmittedEvents,
    getAdviseePendingEvents,
    toggleFeatured,
    deleteEvent,
    getGlobalPendingRequests,
    initEventCron
}
