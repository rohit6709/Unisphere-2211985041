import mongoose from 'mongoose';

const directConversationParticipantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'participants.userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['Student', 'Faculty', 'Admin']
    }
}, { _id: false });

const directConversationSchema = new mongoose.Schema({
    participants: {
        type: [directConversationParticipantSchema],
        validate: {
            validator(value) {
                return Array.isArray(value) && value.length === 2;
            },
            message: 'Direct conversations must have exactly two participants'
        }
    },
    participantHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'createdByModel'
    },
    createdByModel: {
        type: String,
        required: true,
        enum: ['Student', 'Faculty', 'Admin']
    },
    lastMessageAt: {
        type: Date,
        default: null,
        index: true
    }
}, { timestamps: true });

directConversationSchema.index({ 'participants.user': 1, 'participants.userModel': 1 });

export const DirectConversation = mongoose.model('DirectConversation', directConversationSchema);
