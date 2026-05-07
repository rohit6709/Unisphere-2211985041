import { Feedback } from '../models/feedback.model.js';
import { Registration } from '../models/registration.model.js';
import { Event } from '../models/event.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const submitFeedback = asyncHandler(async (req, res) => {
    const { eventId, rating, comment, isAnonymous } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        throw new ApiError(400, "Valid rating (1-5) is required");
    }

    // Verify registration and event status
    const registration = await Registration.findOne({
        event: eventId,
        student: req.user._id,
        status: 'registered'
    });

    if (!registration) {
        throw new ApiError(403, "You can only provide feedback for events you registered for");
    }

    const event = await Event.findById(eventId);
    if (new Date() < new Date(event.startsAt)) {
        throw new ApiError(400, "Cannot provide feedback before the event starts");
    }

    const feedback = await Feedback.create({
        event: eventId,
        student: req.user._id,
        rating,
        comment,
        isAnonymous
    });

    return res.status(201).json(new ApiResponse(201, feedback, "Feedback submitted successfully"));
});

const getEventFeedback = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const feedbacks = await Feedback.find({ event: eventId })
        .populate('student', 'name profilePicture')
        .sort({ createdAt: -1 });

    const stats = await Feedback.aggregate([
        { $match: { event: eventId } },
        { $group: { _id: null, averageRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } }
    ]);

    return res.status(200).json(new ApiResponse(200, {
        feedbacks,
        summary: stats[0] || { averageRating: 0, totalReviews: 0 }
    }, "Event feedback retrieved"));
});

export { submitFeedback, getEventFeedback };
