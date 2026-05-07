import { Router } from 'express';
import { loginFaculty, logoutFaculty, changeCurrentPassword, forgotPassword, resetPassword, refreshToken, getProfile, getAllFaculty, updateProfile, toggleFacultyStatus } from "../controllers/facultyAuth.controller.js";
import { uploadFaculty } from "../controllers/facultyCSV.controller.js";
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyRole } from '../middlewares/role.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';

const router = Router();

router.route('/login').post(loginFaculty);
router.route('/refresh-token').post(refreshToken);

router.route('/logout').post(verifyJWT, logoutFaculty);
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').post(resetPassword);
router.route('/profile').get(verifyJWT, getProfile);
router.route('/profile').patch(verifyJWT, updateProfile);

router.route('/upload-csv').post(verifyJWT, verifyRole("admin", "superadmin"), upload.single('file'), uploadFaculty);
router.route('/get-all-faculty').get(verifyJWT, verifyRole("admin", "superadmin", "hod"), getAllFaculty);
router.route('/get-all-faculty/:facultyId/toggle-status').patch(verifyJWT, verifyRole("admin", "superadmin"), toggleFacultyStatus);

export default router;