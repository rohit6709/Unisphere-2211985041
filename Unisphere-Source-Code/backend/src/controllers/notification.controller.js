import mongoose from 'mongoose';
import { Notification } from '../models/notification.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getMyNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, isRead, type } = req.query;

    const filter = { recipient: req.user._id };
    if (isRead !== undefined) {
        filter.isRead = isRead === 'true';
    }
    if (type) {
        filter.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [ notifications, total, unreadCount ] = await Promise.all([
        Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
        Notification.countDocuments(filter),
        Notification.countDocuments({ recipient: req.user._id, isRead: false })
    ])

    return res.status(200).json(new ApiResponse(200, {
        notifications, unreadCount, pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }
    }, "Notifications retrieved successfully"));
})

const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false
    })

    return res.status(200).json(new ApiResponse(200, { unreadCount: count }, "Unread notifications count retrieved successfully"));
})

const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(notificationId)){
        throw new ApiError(400, "Invalid notification ID");
    }

    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user._id },
        { isRead: true, readAt: new Date() },
        { new: true }
    )

    if(!notification){
        throw new ApiError(404, "Notification not found");
    }
    return res.status(200).json(new ApiResponse(200, notification, "Notification marked as read successfully"));
})

const markAllAsRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
    )
    return res.status(200).json(new ApiResponse(200, { markedRead: result.modifiedCount }, "All notifications marked as read successfully"))
})

const deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(notificationId)){
        throw new ApiError(400, "Invalid notification ID");
    }

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: req.user._id
    })

    if(!notification){
        throw new ApiError(404, "Notification not found");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Notification deleted successfully"));
})

export {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
}