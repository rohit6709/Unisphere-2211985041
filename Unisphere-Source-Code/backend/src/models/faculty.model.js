import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const facultySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true
    },
    employeeId: {
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
    designation: {
        type: String,
        required: true,
        trim: true,
        enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HOD', 'Director', 'Dean', 'Other']
    },
    officeHours: {
        type: String,
        trim: true,
        default: null
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    password:{
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['faculty', 'hod'],
        default: 'faculty'
    },
    isFirstLogin: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    refreshToken: {
        type: String,
        default: null
    },
    passwordChangeAt: {
        type: Date,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: undefined
    },
    passwordResetExpiry: {
        type: Date,
        default: undefined
    },
    lastLogin: {
        type: Date,
        default: null
    }
},{timestamps: true});

facultySchema.pre('save', async function(){
    if(!this.isModified('password')){
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
})

facultySchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

facultySchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        email: this.email,
        role: this.role,
        employeeId: this.employeeId
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
)
}

facultySchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export const Faculty = mongoose.model('Faculty', facultySchema);