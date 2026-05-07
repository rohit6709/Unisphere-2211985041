import { ApiError } from "../utils/ApiError.js";

export const verifyRole = (...roles) => {
    return (req, _res, next) => {
        if(!req.user){
            throw new ApiError(401, "Unauthorized: User not authenticated");
        }
        if(!roles.includes(req.user.role)){
            throw new ApiError(403, `Forbidden: Required role(s): ${roles.join(", ")}`)
        }
        next();
    }
}