import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


const adminSchema = new mongoose.Schema({
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
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["admin", "superadmin"],
        default: "admin"
    },
    permissions:{
        manageStudents: {type: Boolean, default: true},
        manageFaculty: {type: Boolean, default: true},
        manageGroups: {type: Boolean, default: true},
        viewReports: {type: Boolean, default: true},
        manageAdmins: {type: Boolean, default: false}
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFirstLogin: {
        type:Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null
    },
    lastLogin: {
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
    }
},{ timestamps: true });

adminSchema.pre('save', async function () {
    if(!this.isModified("password")){
        return;
    }
    this.password = await bcrypt.hash(this.password, 10);
})

adminSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password);
}

adminSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id: this._id,
        email: this.email,
        role: this.role,
        permissions: this.permissions
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

adminSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const Admin = mongoose.model("Admin", adminSchema);