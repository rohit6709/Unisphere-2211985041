import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxLength: 500
    },
    isAnonymous: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Prevent multiple feedbacks from same student for same event
feedbackSchema.index({ event: 1, student: 1 }, { unique: true });

export const Feedback = mongoose.model('Feedback', feedbackSchema);
