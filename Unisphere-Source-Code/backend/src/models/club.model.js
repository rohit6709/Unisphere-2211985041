import mongoose from "mongoose";
import { INTEREST_CATEGORIES } from "../constants/interests.js";

const clubSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    department: {
        type: String,
        trim: true,
        default: null
    },
    description: {
        type: String,
        trim: true,
        default: null
    },
    logoUrl: {
        type: String,
        trim: true,
        default: null
    },
    bannerUrl: {
        type: String,
        trim: true,
        default: null
    },
    president: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        default: null
    },
    vicePresident: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        default: null
    },
    advisors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
    status: {
        type: String,
        enum: ["pending", "active", "inactive", "rejected"],
        default: "pending"
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: null
    },
    tags: {
        predefined: [{
            type: String,
            enum: INTEREST_CATEGORIES
        }],
        custom: [{
            type: String,
            trim: true,
            maxlength: 30,
            lowercase: true
        }]
    }
}, { timestamps: true });


clubSchema.virtual('memberCount').get(function() {
    return Array.isArray(this.members) ? this.members.length : 0;
})

clubSchema.set('toJSON', { virtuals: true });
clubSchema.set('toObject', { virtuals: true });

clubSchema.index({ "tags.predefined": 1 });
clubSchema.index({ status: 1, "tags.predefined": 1 });

export const Club = mongoose.model('Club', clubSchema);