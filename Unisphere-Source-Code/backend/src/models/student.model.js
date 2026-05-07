import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { INTEREST_CATEGORIES } from '../constants/interests.js';

const studentSchema = new mongoose.Schema({
   name: {
    type: String,
    required: true,
    trim: true
   },
   email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
   },
   rollNo: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
   },
   department: {
    type: String,
    required: true,
    trim: true
   },
   password: {
    type: String,
    required: true,
    trim: true
   },
   role: {
    type: String,
    enum: ['student', 'club_president', 'club_vice_president'],
    default: 'student',
    required: true,
   },
   club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    default: null
   },
   isFirstLogin: {
    type: Boolean,
    default: true,
   },
   isActive: {
    type: Boolean,
    default: true
   },
    passwordChangedAt: {
        type: Date,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: undefined,
    },
    passwordResetExpiry: {
        type: Date,
        default: undefined,
    },
    refreshToken: {
        type: String,
        default: undefined
    },
    interests: {
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
    },
    isOnboarded: {
        type: Boolean,
        default: false
    }
},{timestamps: true});

studentSchema.pre('save', async function(){
    if(!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password,10);
})

studentSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

studentSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        name: this.name,
        email: this.email,
        role: this.role
    }, 
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
    )
}

studentSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

studentSchema.index({ "interests.predefined": 1 });

export const Student = mongoose.model('Student',studentSchema);