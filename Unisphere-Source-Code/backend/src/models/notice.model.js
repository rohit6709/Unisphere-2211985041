import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Notice title is required"],
            trim: true,
        },
        content: {
            type: String,
            required: [true, "Notice content is required"],
            trim: true,
        },
        // ─── Who posted ───────────────────────────────────────────────────────
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "postedByModel",   // dynamic ref based on role
        },
        postedByModel: {
            type: String,
            required: true,
            enum: ["Admin", "Faculty", "Student"],
        },
        postedByRole: {
            type: String,
            required: true,
            enum: ["admin", "superadmin", "faculty", "hod", "club_president"],
        },
        // ─── Targeting ────────────────────────────────────────────────────────
        targetAudience: {
            type: String,
            enum: ["all", "department", "club"],
            default: "all",
        },
        targetDepartment: {
            type: String,
            default: null,  // only if targetAudience = "department"
        },
        targetClub: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Club",
            default: null,  // only if targetAudience = "club"
        },
        // ─── Attachment ───────────────────────────────────────────────────────
        attachment: {
            type: {
                url: { type: String, default: null },
                filename: { type: String, default: null },
                mimetype: { type: String, default: null },
            },
            default: {},
        },
        // ─── Expiry ───────────────────────────────────────────────────────────
        expiresAt: {
            type: Date,
            default: null,  // null = never expires
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // ─── Priority ─────────────────────────────────────────────────────────
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
    },
    { timestamps: true }
);

// ─── Index for faster queries ─────────────────────────────────────────────────
noticeSchema.index({ postedBy: 1 });
noticeSchema.index({ targetAudience: 1, targetDepartment: 1 });
noticeSchema.index({ targetClub: 1 });
noticeSchema.index({ expiresAt: 1 });
noticeSchema.index({ isActive: 1 });

export const Notice = mongoose.model("Notice", noticeSchema);