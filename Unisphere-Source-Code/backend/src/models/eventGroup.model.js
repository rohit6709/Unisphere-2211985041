import mongoose from 'mongoose';

const eventGroupSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
        unique: true
    },
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "members.userModel",
            required: true
        },
        userModel: {
            type: String,
            enum: ["Student", "Faculty"],
            required: true
        },
        role: {
            type: String,
            enum: ["advisor", "president", "vicePresident", "member"],
            default: "member"
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ["active", "dissolved"],
        default: "active"
    },
    closingWarningJobId: {
        type: String,
        default: null
    },
    dissolveJobId: {
        type: String,
        default: null
    },
    dissolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

eventGroupSchema.index({ event: 1 });
eventGroupSchema.index({ "members.user": 1 });
eventGroupSchema.index({ club: 1, status: 1 });

export const EventGroup = mongoose.model("EventGroup", eventGroupSchema);