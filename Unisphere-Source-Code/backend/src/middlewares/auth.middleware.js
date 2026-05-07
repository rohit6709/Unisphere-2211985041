import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from 'jsonwebtoken';
import { Student } from "../models/student.model.js";
import { Admin } from "../models/admin.model.js";
import { Faculty } from "../models/faculty.model.js";

const resolveUserModel = (role) => {
    if(["admin", "superadmin"].includes(role)) return Admin;
    if(["faculty", "hod"].includes(role)) return Faculty;
    return Student;
}

export const verifyJWT = asyncHandler( async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
        if(!token){
            throw new ApiError(401, 'Access token is missing');
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const UserModel = resolveUserModel(decodedToken?.role);
        const user = await UserModel.findById(decodedToken?._id).select('-password -refreshToken');

        if(!user){
            throw new ApiError(401, 'Invalid access token');
        }

        if(!user.isActive){
            throw new ApiError(403, 'Account is deactivated. Please contact administrator.');
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || 'Invalid access token');
    }
})