import mongoose from "mongoose";
import { Club } from "../models/club.model.js";
import { Event } from "../models/event.model.js";
import { Registration } from "../models/registration.model.js";
import { EventGroup } from "../models/eventGroup.model.js";
import { Notification } from "../models/notification.model.js";
import { Student } from "../models/student.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const getStudentDashboard = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
    const studentObjId = new mongoose.Types.ObjectId(studentId);

    const [
        student,
        clubs,
        myRegistrations,
        unreadNotificationCount
    ] = await Promise.all([
        Student.findById(studentId)
            .select("name email rollNo department interests isOnboarded role")
            .lean(),

        Club.find({ members: studentId, status: "active" })
            .populate("president", "name rollNo")
            .populate("advisors", "name employeeId department")
            .select("name description department president advisors members status tags")
            .lean(),

        Registration.find({ student: studentId, status: "registered" })
            .select("event")
            .lean(),

        Notification.countDocuments({ recipient: studentId, isRead: false })
    ]);

    const clubIds = clubs.map(c => c._id);

    const [
        upcomingEvents,
        lastMessagesForGroups,
        lastMessagesForClubs
    ] = await Promise.all([

        Event.find({
            club: { $in: clubIds },
            status: { $in: ["approved", "live"] },
            startsAt: { $gte: new Date() }
        })
        .populate("club", "name department")
        .select("title eventType status startsAt endsAt venue maxParticipants registrationDeadline posterUrl club isFeatured")
        .sort({ startsAt: 1 })
        .limit(5)
        .lean(),

        EventGroup.aggregate([
            {
                $match: {
                    "members.user": studentObjId,  
                    status: "active"
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { groupId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$room", "$$groupId"] },
                                        { $eq: ["$roomType", "EventGroup"] },
                                        { $eq: ["$isDeleted", false] }
                                    ]
                                }
                            }
                        },
                        { $sort: { _id: -1 } },
                        { $limit: 1 },
                        { $project: { content: 1, type: 1, createdAt: 1, sender: 1 } }
                    ],
                    as: "lastMessage"
                }
            },
            {
                $lookup: {
                    from: "events",
                    localField: "event",
                    foreignField: "_id",
                    as: "eventData",
                    pipeline: [{ $project: { title: 1, status: 1 } }]
                }
            },
            {
                $project: {
                    name: 1,
                    status: 1,
                    eventTitle: { $arrayElemAt: ["$eventData.title", 0] },
                    lastMessage: { $arrayElemAt: ["$lastMessage", 0] }
                }
            }
        ]),

        Club.aggregate([
            {
                $match: {
                    members: studentObjId,
                    status: "active"
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { clubId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$room", "$$clubId"] },
                                        { $eq: ["$roomType", "Club"] },
                                        { $eq: ["$isDeleted", false] }
                                    ]
                                }
                            }
                        },
                        { $sort: { _id: -1 } },
                        { $limit: 1 },
                        { $project: { content: 1, type: 1, createdAt: 1, sender: 1 } }
                    ],
                    as: "lastMessage"
                }
            },
            {
                $project: {
                    name: 1,
                    department: 1,
                    lastMessage: { $arrayElemAt: ["$lastMessage", 0] }
                }
            }
        ])
    ]);

    const registeredEventIds = new Set(
        myRegistrations.map(r => r.event.toString())
    );

    const enrichedEvents = upcomingEvents.map(event => ({
        ...event,
        isRegistered: registeredEventIds.has(event._id.toString())
    }));

    const activeChats = [
        ...lastMessagesForGroups.map(group => ({
            roomType: "EventGroup",
            roomId: group._id,
            name: group.name,
            eventTitle: group.eventTitle || null,
            status: group.status,
            lastMessage: group.lastMessage || null
        })),
        ...lastMessagesForClubs.map(club => ({
            roomType: "Club",
            roomId: club._id,
            name: club.name,
            department: club.department || null,
            status: "active",
            lastMessage: club.lastMessage || null
        }))
    ].sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : 0;
        return bTime - aTime;
    });

    const clubSummary = clubs.map(({ members, ...club }) => ({
        ...club,
        memberCount: members?.length || 0
    }));

    return res.status(200).json(
        new ApiResponse(200, {
            student,
            clubs: clubSummary,
            upcomingEvents: enrichedEvents,
            activeChats,
            notifications: {
                unreadCount: unreadNotificationCount
            }
        }, "Dashboard retrieved successfully")
    );
});

export { getStudentDashboard };