import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
    // event lifecycle
    "event_submitted", // advisor of that club
    "event_approved", // president + vp
    "event_rejected", // president + vp
    "event_live", // all registered students
    "event_cancelled", // all registered students

    // club membership
    "club_request_approved", // student who requested the club
    "club_request_rejected", // student who requested the club
    "club_member_removed", // removed member
    "club_role_assigned", // assigned member
    "club_advisor_assigned", // assigned advisor

    // Registration
    "registration_confirmed", // registering student

    // Chat (only when not in room)
    "new_message",

    // club matching
    "club_recommendation",
];

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "recipientModel",
        required: true,
        index: true
    },
    recipientModel: {

        type: String, 
        enum: ["Student", "Faculty"],
        required: true
    },
    type: {
        type: String, 
        enum: NOTIFICATION_TYPES,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    priority: {
        type: String,
        enum: ["low", "normal", "high", "critical"],
        default: "normal"
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export { NOTIFICATION_TYPES };