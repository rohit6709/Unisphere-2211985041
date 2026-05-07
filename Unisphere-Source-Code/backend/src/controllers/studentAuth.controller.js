import { Student } from '../models/student.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordChangedMail, sendPasswordResetMail } from '../utils/sendMail.js';

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await Student.findById(userId);
        if(!user){
            throw new ApiError(404, 'User not found');
        }
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, 'Something went wrong while creating Tokens');
    }
}

const loginUser = asyncHandler( async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password){
        throw new ApiError(400, 'Email and password is required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await Student.findOne({email: normalizedEmail});
    if(!user){
        throw new ApiError(404, 'User does not exist');
    }

    if(!user.isActive){
        throw new ApiError(403, 'Account is deactivated. Please contact administrator.');
    }
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new ApiError(401, 'Invalid user credentials');
    }
    
    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await Student.findById(user._id).select('-password -refreshToken');

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    if(user.isFirstLogin){
        return res.status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, forcePasswordChange: true }, 'First login: Please change your password.'));
    }

    res.status(200).cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken }, 'User logged in successfully'));
})

const logoutUser = asyncHandler( async (req, res) => {
    await Student.findByIdAndUpdate(req.user._id, {
        $unset: {refreshToken: 1}
    },{ new : true }
);

const cookieOptions = {
    httpOnly: true,
    secure: true
}

res.status(200)
.clearCookie('accessToken', cookieOptions)
.clearCookie('refreshToken', cookieOptions)
.json(new ApiResponse(200, {}, 'User logged out successfully'));

})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(400, 'Unauthorized: Refresh token is missing');
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await Student.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(404, 'Invalid refresh token: User not found');
        }
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, 'Invalid refresh token: Token is expired or used');
        }

        const accessToken = user.generateAccessToken();
        const cookieOptions = {
            httpOnly: true,
            secure: true
        }
        return res.status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', incomingRefreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken, refreshToken: incomingRefreshToken }, 'Access token refreshed successfully'));

    } catch (error) {
        throw new ApiError(401, error?.message || 'Unauthorized: Invalid refresh token');
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if(!currentPassword || !newPassword || !confirmPassword){
        throw new ApiError(400, 'All password fields are required');
    }
    if(newPassword !== confirmPassword){
        throw new ApiError(400, 'Passwords do not match');
    }
    if(newPassword.length < 6){
        throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const user = await Student.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401, 'Current password is incorrect');
    }
    user.password = newPassword;
    user.isFirstLogin = false;
    user.passwordChangedAt = new Date();

    await user.save();
    res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
})

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if(!email){
        throw new ApiError(400, 'Email is required');
    }
    const user = await Student.findOne({email: email.toLowerCase()});
    if(!user){
        return res.status(200)
        .json(new ApiResponse(200, {}, "If this email exists, a reset link has been sent"));
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}?role=student`;

    try{
        await sendPasswordResetMail({
            name: user.name,
            email: user.email,
            resetUrl
        });

        return res.status(200)
        .json(new ApiResponse(200, {}, "If this email exists, a reset link has been sent"));

    }
    catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetExpiry = undefined;
        await user.save({ validateBeforeSave: false });
        
        throw new ApiError(500, "Failed to send reset email. Try again later.");
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if(!newPassword || !confirmPassword){
        throw new ApiError(400,"All fields are required");
    }
    if(newPassword !== confirmPassword){
        throw new ApiError(400, "Passwords do not match");
    }
    if(newPassword.length < 6){
        throw new ApiError(400, "Password must be at least 6 characters");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await Student.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpiry: {$gt: Date.now()}
    });

    if(!user){
        throw new ApiError(400, "Reset token is invalid or has expired");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.isFirstLogin = false;
    user.passwordChangedAt = new Date();

    await user.save();

    await sendPasswordChangedMail({ name: user.name, email: user.email });

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully. Please login."));
})

const getProfile = asyncHandler(async (req, res) => {
    const user = await Student.findById(req.user._id).select(
        "-password -refreshToken"
    );
    if (!user) throw new ApiError(404, "User not found");
 
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Profile fetched successfully"));
});

const getAllStudents = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const department = (req.query.department || '').trim();

    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { rollNo: { $regex: search, $options: 'i' } },
        ];
    }

    if (department) {
        filter.department = department;
    }

    const [students, total] = await Promise.all([
        Student.find(filter)
            .select('-password -refreshToken -passwordResetToken -passwordResetExpiry')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Student.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                students,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1,
                },
            },
            'Students fetched successfully'
        )
    );
});

const toggleStudentStatus = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);

    if (!student) {
        throw new ApiError(404, "Student not found");
    }

    student.isActive = !student.isActive;
    await student.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, { isActive: student.isActive }, `Student ${student.isActive ? "activated" : "deactivated"} successfully`));
});

export { loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, forgotPassword, resetPassword, getProfile, getAllStudents, toggleStudentStatus };