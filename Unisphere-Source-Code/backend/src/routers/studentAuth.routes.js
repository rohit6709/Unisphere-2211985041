import { Router } from 'express';
import { loginUser, logoutUser, changeCurrentPassword, forgotPassword, resetPassword, getProfile, refreshAccessToken, getAllStudents, toggleStudentStatus } from '../controllers/studentAuth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { uploadStudents } from '../controllers/studentCSV.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import { verifyRole } from '../middlewares/role.middleware.js';

const router = Router();

router.route('/login').post(loginUser);
router.route('/refresh-token').post(refreshAccessToken);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').post(resetPassword);

router.route('/logout').post(verifyJWT, logoutUser);
router.route('/change-password').post(verifyJWT, changeCurrentPassword);
router.route('/profile').get(verifyJWT, getProfile);
router.route('/').get(verifyJWT, verifyRole('admin', 'superadmin', 'hod'), getAllStudents);

router.route('/upload-csv').post(verifyJWT, verifyRole("admin","superadmin"), upload.single('file'), uploadStudents);
router.route('/:studentId/toggle-status').patch(verifyJWT, verifyRole("admin", "superadmin"), toggleStudentStatus);


export default router;
