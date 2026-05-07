import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    club: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Club',
        required: true
    },
    status: {
        type: String,
        enum: ['registered', 'cancelled', 'attended', 'no_show'],
        default: 'registered'
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    cancelledAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

registrationSchema.index({ event: 1, student: 1 }, { unique: true });
registrationSchema.index({ student: 1, createdAt: -1 });
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ club: 1, status: 1 });


export const Registration = mongoose.model('Registration', registrationSchema);
