import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, { timestamps: true });

export const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
