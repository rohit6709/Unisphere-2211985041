import mongoose from "mongoose";

const approvalLogSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        index: true
    },
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            "created",
            "submitted",
            "approved",
            "rejected",
            "resubmitted",
            "cancelled",
            "auto_live",
            "auto_completed",
            "auto_archived",
            "featured",
            "conflict_flagged"
        ]
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "performedByModel",
        default: null
    },
    performedByModel: {
        type: String,
        enum: ["Student", "Faculty", "Admin", null],
        default: null
    },
    fromStatus: {
        type: String,
        default: null,
    },
    toStatus: {
        type: String,
        default: null
    },
    reason: {
        type: String,
        trim: true,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
},{ timestamps: true });

approvalLogSchema.index({ club: 1, createdAt: -1 });
approvalLogSchema.index({ event: 1, createdAt: 1 });

export const ApprovalLog = mongoose.model("ApprovalLog", approvalLogSchema);