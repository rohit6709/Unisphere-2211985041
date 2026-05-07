import { Faculty } from "../models/faculty.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordChangedMail, sendPasswordResetMail } from "../utils/sendMail.js";

const generateAccessTokenAndRefreshToken = async (facultyId) => {
    try{
        const faculty = await Faculty.findById(facultyId);
        if(!faculty){
            throw new ApiError(404, 'Faculty not found');
        }
        const accessToken = faculty.generateAccessToken();
        const refreshToken = faculty.generateRefreshToken();

        faculty.refreshToken = refreshToken;
        faculty.lastLogin = new Date();
        await faculty.save({ validateBeforeSave : false });

        return { accessToken, refreshToken };
    }
    catch(error){
        throw new ApiError(500, "Something went wrong while creating tokens");
    }
}

const loginFaculty = asyncHandler( async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password){
        throw new ApiError(400, 'Email and password is required');
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const faculty = await Faculty.findOne({email : normalizedEmail});
    if(!faculty){
        throw new ApiError(404, 'Faculty does not exist');
    }

    if(!faculty.isActive){
        throw new ApiError(403, "Your account has been deactivated. Contact admin");
    }

    const isPasswordCorrect = await faculty.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new ApiError(401, 'Invalid faculty credentials');
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(faculty._id);
    await Faculty.findByIdAndUpdate(faculty._id, {
        $set: { refreshToken: refreshToken}
    });

    const loggedInFaculty = await Faculty.findById(faculty._id).select('-password -refreshToken');

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }
    
    if(faculty.isFirstLogin){
        return res.status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .json( new ApiResponse(200, { faculty: loggedInFaculty, accessToken, forcePasswordChange: true }, "First login: Please change your password" ));
    }

    return res.status(200).cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(new ApiResponse(200, {faculty: loggedInFaculty, accessToken, refreshToken}, 'Faculty logged in successfully'));
})

const logoutFaculty = asyncHandler( async (req, res)=> {
    await Faculty.findByIdAndUpdate(req.user._id, {
        $unset: {refreshToken: 1}
    },{ new: true })

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    res.status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
})

const refreshToken = asyncHandler( async (req, res)=> {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(400, 'Unauthorized: Refresh token is missing');
    }
    try{
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const faculty = await Faculty.findById(decodedToken?._id);
        if(!faculty){
            throw new ApiError(404, 'Invalid refresh token: Faculty not found');
        }
        if(faculty.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, 'Invalid refresh token: Token is expired or used');
        }

        const accessToken = faculty.generateAccessToken();
        const cookieOptions =  {
            httpOnly: true,
            secure: true
        }
        return res.status(200)
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', incomingRefreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken, refreshToken:incomingRefreshToken }, 'Access token refreshed successfully'));

    }
    catch(error){
        throw new ApiError(401, error?.message || 'Unauthorized: Invalid refresh token');
    }
})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } =  req.body;
    if(!currentPassword || !newPassword || !confirmPassword){
        throw new ApiError(400, "All password field are required");
    }
    if(newPassword !== confirmPassword){
        throw new ApiError(400, "New password and confirm password do not match");
    }
    if(newPassword.length < 6){
        throw new ApiError(400, "Password must be at least 6 characters");
    }

    const faculty = await Faculty.findById(req.user?._id);
    const isPasswordCorrect = await faculty.isPasswordCorrect(currentPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401, "Current password is incorrect");
    }
    faculty.password = newPassword;
    faculty.isFirstLogin = false;
    faculty.passwordChangeAt = new Date();

    await faculty.save();

    return res.status(200)
    .json(new ApiResponse(200, {}, 'Password changed successfully'));
})

const forgotPassword = asyncHandler( async (req, res)=> {
    const { email } = req.body;
    if(!email){
        throw new ApiError(400, 'Email is required');
    }
    const faculty = await Faculty.findOne({email: email});
    if(!faculty){
        return res.status(200).json(new ApiResponse(200, {}, "If this email exists, a reset link has been sent"));
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest('hex');

    faculty.passwordResetToken = hashedToken;
    faculty.passwordResetExpiry = Date.now() + 15 * 60 * 1000;
    await faculty.save({validateBeforeSave: false});

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}?role=faculty`;

    try{
        await sendPasswordResetMail({
            name: faculty.name,
            email: faculty.email,
            resetUrl
        });
        return res.status(200).json(new ApiResponse(200, {}, "If this email exists, a reset link has been sent"));
    }
    catch(error){
        faculty.passwordResetToken = undefined;
        faculty.passwordResetExpiry = undefined;
        await faculty.save({validateBeforeSave: false});

        throw new ApiError(500, "Failed to send reset email. Try again later.");
    }
});

const resetPassword = asyncHandler( async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword} = req.body;
    if(!newPassword || !confirmPassword){
        throw new ApiResponse(400, "All fields are required");
    }
    if(newPassword !== confirmPassword){
        throw new ApiError(400, "Password do not match");
    }
    if(newPassword.length < 6){
        throw new ApiError(400, "Password must be at least 6 characters");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest('hex');

    const faculty = await Faculty.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpiry: { $gt: Date.now() }
    })

    if(!faculty){
        throw new ApiError(400, "Reset token is invalid or has expired");
    }

    faculty.password = newPassword;
    faculty.passwordResetToken = undefined;
    faculty.passwordResetExpiry = undefined;
    faculty.isFirstLogin = false;
    faculty.passwordChangeAt = new Date();
    await faculty.save();

    await sendPasswordChangedMail({ name: faculty.name, email: faculty.email});

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully. Please login."));
})

const getProfile = asyncHandler( async (req, res)=> {
    const faculty = await Faculty.findById(req.user?._id).select('-password -refreshToken');
    if(!faculty){
        throw new ApiError(404, "Faculty not found");
    }
    return res.status(200)
    .json(new ApiResponse(200, faculty, "Profile fetched successfully"));

})

const updateProfile = asyncHandler( async (req, res)=> {
    const allowedFields = ["name", "phone", "officeHours"];

    const updates = {};
    for(let field of allowedFields){
        if(req.body[field] !== undefined){
            updates[field] = req.body[field];
        }
    }

    if(!Object.keys(updates).length){
        throw new ApiError(400, "No valid fields provided to update");
    }

    const faculty = await Faculty.findByIdAndUpdate(req.user._id, 
        { $set: updates},
        { new: true, runValidators: true}
    ).select("-password -refreshToken");

    return res.status(200)
    .json(new ApiResponse(200, faculty, "Profile updated successfully"));
})

const getAllFaculty = asyncHandler( async (req, res)=> {
    const {
        page = 1,
        limit = 10,
        department,
        designation,
        search,
        isActive
    } = req.query;
    const filter = {};
    
    if(department) filter.department = department;
    if(designation) filter.designation = designation;
    if(isActive !== undefined) filter.isActive = isActive === 'true';
    if(search){
        filter.$or = [
            {name: { $regex: search, $options: "i"}},
            {email: { $regex: search, $options: "i"}},
            {employeeId: { $regex: search, $options: "i"}},
        ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [faculty, total] = await Promise.all([
        Faculty.find(filter)
        .select("-password -refreshToken")
        .sort({createdAt : -1})
        .skip(skip)
        .limit(Number(limit)),
        Faculty.countDocuments(filter),
    ]);

    return res.status(200)
    .json(new ApiResponse(200,
        { faculty, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit))},
    },
    "Faculty list fetched successfully"
));
});

const toggleFacultyStatus = asyncHandler( async (req, res)=> {
    const { facultyId } = req.params;

    const faculty = await Faculty.findById(facultyId);
    if(!faculty){
        throw new ApiError(404, "Faculty not found");
    }
    faculty.isActive = !faculty.isActive;
    await faculty.save({ validateBeforeSave : false });

    return res.status(200)
    .json(new ApiResponse(200, { isActive: faculty.isActive }, `Faculty ${faculty.isActive ? "activated" : "deactivated"} successfully`))

})

export { loginFaculty, logoutFaculty, changeCurrentPassword, forgotPassword, resetPassword, refreshToken, getProfile, updateProfile, getAllFaculty, toggleFacultyStatus };