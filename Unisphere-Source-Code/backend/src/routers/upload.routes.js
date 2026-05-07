import { Router } from 'express';
import { upload } from '../config/cloudinary.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Secure upload endpoint
router.post('/image', verifyJWT, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "No file uploaded");
    }

    return res.status(200).json(
        new ApiResponse(200, {
            url: req.file.path,
            publicId: req.file.filename,
            size: req.file.size
        }, "Image uploaded successfully to cloud")
    );
}));

export default router;
