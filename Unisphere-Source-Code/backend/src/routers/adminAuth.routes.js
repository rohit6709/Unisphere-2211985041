import { Router } from 'express';
import { loginAdmin, logoutAdmin, createAdmin, getAllAdmins, toggleAdminStatus, changeAdminPassword, forgotAdminPassword, resetAdminPassword, getProfile, refreshAccessToken, getPlatformStats } from '../controllers/adminAuth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyRole } from '../middlewares/role.middleware.js';

const router = Router();

router.route("/login").post(loginAdmin);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(forgotAdminPassword);
router.route("/reset-password/:token").post(resetAdminPassword);

router.route("/logout").post(verifyJWT, logoutAdmin);
router.route("/change-password").post(verifyJWT, changeAdminPassword);
router.route("/profile").get(verifyJWT, getProfile);


router.route("/create-admin").post(verifyJWT, verifyRole("superadmin"), createAdmin);
router.route("/get-all-admins").get(verifyJWT, verifyRole("superadmin"), getAllAdmins);
router.route("/:adminId/toggle-status").patch(verifyJWT, verifyRole("superadmin"), toggleAdminStatus);
router.route("/stats").get(verifyJWT, verifyRole("superadmin"), getPlatformStats);

export default router;