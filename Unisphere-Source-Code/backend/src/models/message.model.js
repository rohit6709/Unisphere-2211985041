import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    room: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'roomType',
        required: true,
        index: true
    },
    roomType: {
        type: String,
        enum: ['EventGroup', 'Club', 'DirectConversation'],
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'senderModel',
        default: null
    },
    senderModel: {
        type: String,
        enum: ['Student', 'Faculty', 'Admin'],
        default: null,
        required: false
    },
    type: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text'
    },
    content: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: null
    },
    fileUrl: {
        type: String,
        default: null,
        trim: true
    },
    fileName: {
        type: String,
        default: null,
        trim: true
    },
    fileType: {
        type: String,
        trim: true,
        default: null
    },
    fileSize: {
        type: Number,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'deletedByModel',
        default: null
    },
    deletedByModel: {
        type: String,
        enum: ['Student', 'Faculty', 'Admin'],
        default: null,
        required: false
    }
}, {
    timestamps: true
})

messageSchema.index({ room: 1, _id: -1 });
messageSchema.index({ sender: 1 });

export const Message = mongoose.model('Message', messageSchema);
