import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    eventType: {
        type: String,
        required: true,
        enum: ["workshop", "seminar", "competition", "cultural", "sports", "other"],
        default: "other"
    },
    visibility: {
        type: String,
        enum: ["club_only", "open"],
        default: "club_only"
    },
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
        required: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "submittedByModel",
        default: null
    },
    submittedByModel: {
        type: String,
        enum: ["Faculty", "Student", "Admin"],
        default: null
    },
    startsAt: {
        type: Date,
        required: true
    },
    endsAt: {
        type: Date,
        required: true
    },
    registrationDeadline: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        min: 1,
        default: null
    },
    venue: {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        building: {
            type: String,
            trim: true,
            default: null
        },
        capacity: {
            type: Number,
            default: null
        }
    },
    maxParticipants: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: [
            "draft",
            "pending_approval",
            "approved",
            "rejected",
            "live",
            "completed",
            "cancelled",
            "archived"
        ],
        default: "draft"
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty",
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: null
    },
    cancellationReason: {
        type: String,
        trim: true,
        default: null
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "cancelledByModel",
        default: null
    },
    cancelledByModel: {
        type: String,
        enum: ["Faculty", "Student", "Admin"],
        default: null
    },

    isFeatured: {
        type: Boolean,
        default: false
    },
    hasConflict: {
        type: Boolean,
        default: false
    },
    conflictDetails: {
        type: String,
        trim: true,
        default: null
    },

    posterUrl: {
        type: String,
        trim: true,
        default: null
    },

}, { timestamps: true });



eventSchema.set("toJSON", { virtuals: true });
eventSchema.set("toObject", { virtuals: true });

eventSchema.index({ status: 1, startsAt: 1 });
eventSchema.index({ status: 1, endsAt: 1 });
eventSchema.index({ club: 1, status: 1 });

eventSchema.index({ "venue.name": 1, startsAt: 1, endsAt: 1 });

export const Event = mongoose.model("Event", eventSchema);