import { Admin } from "../models/admin.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from 'crypto';
import { sendAccountActivatedMail, sendAccountDeactivatedMail, sendCredentialsMail, sendPasswordChangedMail, sendPasswordResetMail } from "../utils/sendMail.js";
import jwt from 'jsonwebtoken';

const generateAccessandRefreshToken = async (adminId) => {
    try {
        const admin = await Admin.findById(adminId);
        if(!admin){
            throw new ApiError(404, 'Admin not found');
        }
        const accessToken = admin.generateAccessToken();
        const refreshToken = admin.generateRefreshToken();
    
        admin.refreshToken = refreshToken;
        admin.lastLogin = new Date();
        await admin.save({ validateBeforeSave: false });
    
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating tokens");
    }
}

const loginAdmin = asyncHandler( async (req,res)=> {
    const { email, password } = req.body;
    if(!email || !password){
        throw new ApiError(400, 'Email and password is required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const admin = await Admin.findOne({email: normalizedEmail});
    if(!admin){
        throw new ApiError(404, 'Admin does not exist');
    }
    if(!admin.isActive){
        throw new ApiError(403, "Account deactivated. Contact superadmin.");
    }

    const isPasswordCorrect = await admin.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new ApiError(401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshToken(admin._id);
    const loggedInAdmin = await Admin.findById(admin._id).select("-password -refreshToken");

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    if(admin.isFirstLogin){
        return res.status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .json(new ApiResponse(200, { admin: loggedInAdmin , accessToken, forcePasswordChange: true }, "First login: Please change your password"))
    }

    return res.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, {admin: loggedInAdmin, accessToken}, "Admin logged in successfuly"));
})

const logoutAdmin = asyncHandler( async (req, res)=> {
    await Admin.findByIdAndUpdate(req.user._id, {
        $unset: {refreshToken: 1}
    },{ new: true })

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    res.status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'Admin looged out successfully'));
});

const refreshAccessToken = asyncHandler( async (req, res)=> {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(400, "Unauthorized: Refresh token is missing");
    }
    try{
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const admin = await Admin.findById(decodedToken._id);
        if(!admin){
            throw new ApiError(404, "Invalid refresh token: User not found");
        }
        if(admin.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, 'Invalid refresh token: Token is expired or used');
        }

        const accessToken = admin.generateAccessToken();
        const cookieOptions = {
            httpOnly: true,
            secure: true
        }
        return res.status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', incomingRefreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed successfully"));
    }
    catch(error){
        throw new ApiError(401, error?.message || "Unauthorized: Invalid refresh token");
    }
})

const changeAdminPassword = asyncHandler( async (req, res)=> {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if(!currentPassword || !newPassword || !confirmPassword){
        throw new ApiError(400, "All fields are required");
    }
    if(newPassword !== confirmPassword){
        throw new ApiError(400, "Passwords do not match");
    }
    if(newPassword.length < 6){
        throw new ApiError(400, "Password must be at least 6 characters");
    }

    const admin = await Admin.findById(req.user._id);
    const isPasswordCorrect = await admin.isPasswordCorrect(currentPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401, "Current password is incorrect");
    }

    admin.password = newPassword;
    admin.isFirstLogin = false;
    await admin.save();

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
})

const forgotAdminPassword = asyncHandler( async (req, res) => {
    const { email } = req.body;
    if(!email){
        throw new ApiError(400, "Email is required");
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if(!admin){
        return res.status(200).json(new ApiResponse(200, {}, "if this email exists, a reset link has been sent"));
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    admin.passwordResetToken = hashedToken;
    admin.passwordResetExpiry = Date.now() + 15 * 60 * 1000;
    await admin.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}?role=admin`;

    try{
        await sendPasswordResetMail({
            name: admin.name,
            email: admin.email,
            resetUrl
        });

        return res.status(200).json(new ApiResponse(200, {}, "If this email exists, a reset link has been sent"));
    }
    catch(error){
        admin.passwordResetToken = undefined;
        admin.passwoordResetExpiry = undefined;
        await admin.save({ validateBeforeSave: false });

        throw new ApiError(500, "Failed to send reset email. Try again later.");
    }
})

const resetAdminPassword = asyncHandler( async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;
    if(!newPassword || !confirmPassword){
        throw new ApiError(400, "All fields are required");
    }
    if(newPassword !== confirmPassword){
        throw new ApiError(400, "Passwords do not match");
    }
    if(newPassword.length < 6){
        throw new ApiError(400, "Password must be at least 6 characters");
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await Admin.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpiry: { $gt: Date.now() }
    });
    if(!admin){
        throw new ApiError(400, "Reset token is invalid or has expired");
    }

    admin.password = newPassword;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpiry = undefined;
    admin.isFirstLogin = false;
    admin.passwordChangedAt = new Date();
    await admin.save();

    await sendPasswordChangedMail({
        name: admin.name,
        email: admin.email
    });

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully. Please login."));
})

const getProfile = asyncHandler( async (req, res) => {
    const admin = await Admin.findById(req.user._id).select("-password -refreshToken");
    return res.status(200).json(new ApiResponse(200, admin, "Admin profile fetched successfully"));
})

const createAdmin = asyncHandler( async (req, res)=> {
    const { name, email, role } = req.body;
    if(!name || !email){
        throw new ApiError(400, "Name and email are required");
    }

    const existing = await Admin.findOne({email: email.toLowerCase()});
    if(existing){
        throw new ApiError(409, "Admin with this email already exists");
    }

    if(role === "superadmin"){
        const superAdminCount = await Admin.countDocuments({role: "superadmin"});
        if(superAdminCount >= 2){
            throw new ApiError(400, "Maximum 2 superadmins allowed");
        }
    }

    const password = crypto.randomBytes(8).toString('hex');

    const admin = await Admin.create({
        name,
        email: email.toLowerCase(),
        password: password,
        role: role === "superadmin" ? "superadmin" : "admin",
        createdBy: req.user._id,
        isFirstLogin: true,
        permissions: {
            manageStudents: true,
            manageFaculty: true,
            manageGroups: true,
            viewReports: true,
            manageAdmins: role === "superadmin"
        }
    });
    await sendCredentialsMail({
        name: admin.name,
        email: admin.email,
        password,
        role: admin.role
    })

    const created = await Admin.findById(admin._id).select("-password -refreshToken");

    return res.status(201).json(new ApiResponse(201, created, "Admin created successfully"));
})

const getAllAdmins = asyncHandler( async (req, res)=> {
    const admins = await Admin.find({role: "admin"}).select("-password -refreshToken").populate("createdBy", "name email").sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, admins, "Admins fetched successfully"));
})

const toggleAdminStatus = asyncHandler( async (req, res)=> {
    const { adminId } = req.params;
    const admin = await Admin.findById(adminId);
    if(!admin){
        throw new ApiError(404, "Admin not found");
    }

    if(admin.role === "superadmin"){
        throw new ApiError(403, "Cannot deactivate a superadmin");
    }

    admin.isActive = !admin.isActive;
    await admin.save({ validateBeforeSave: false});

    if(admin.isActive){
        await sendAccountActivatedMail({
            name: admin.name,
            email: admin.email,
            role: admin.role
        });
    }
    else{
        await sendAccountDeactivatedMail({
            name: admin.name,
            email: admin.email
        });
    }

    return res.status(200).json(new ApiResponse(200, { isActive: admin.isActive }, `Admin ${admin.isActive ? "activated" : "deactivated"} successfully`));
})

const getPlatformStats = asyncHandler( async (req, res)=> {
    const { Student } = await import("../models/student.model.js");
    const { Faculty } = await import("../models/faculty.model.js");
    const { Club } = await import("../models/club.model.js");
    const { Event } = await import("../models/event.model.js");
    const { Registration } = await import("../models/registration.model.js");

    // 1. Core Counts
    const [
        studentCount,
        facultyCount,
        clubCount,
        eventCount,
        registrationCount,
        activeAdminCount
    ] = await Promise.all([
        Student.countDocuments(),
        Faculty.countDocuments(),
        Club.countDocuments({ status: "active" }),
        Event.countDocuments({ status: "approved" }),
        Registration.countDocuments({ status: "registered" }),
        Admin.countDocuments({ isActive: true })
    ]);

    // 2. Growth Over Time (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const growthStats = await Registration.aggregate([
        {
            $match: {
                createdAt: { $gte: sixMonthsAgo },
                status: "registered"
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: "$createdAt" },
                    year: { $year: "$createdAt" }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 3. Department Distribution
    const departmentStats = await Student.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    const stats = {
        users: {
            students: studentCount,
            faculty: facultyCount,
            admins: activeAdminCount,
            departments: departmentStats
        },
        platform: {
            clubs: clubCount,
            events: eventCount,
            registrations: registrationCount,
            growth: growthStats.map(s => ({
                month: new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(s._id.year, s._id.month - 1)),
                count: s.count
            }))
        }
    };

    return res.status(200).json(new ApiResponse(200, stats, "Platform stats fetched successfully"));
})

export { loginAdmin, logoutAdmin, refreshAccessToken, changeAdminPassword, forgotAdminPassword, resetAdminPassword, getProfile, createAdmin, getAllAdmins, toggleAdminStatus, getPlatformStats };