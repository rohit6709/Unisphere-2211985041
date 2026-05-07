import { Router } from "express";
import { createNotice, updateNotice, deleteNotice, getAllNotices, getMyNotices, getNotice, getMyPostedNotices } from "../controllers/notice.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRole } from "../middlewares/role.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

//Protected routes
router.route('/my').get(verifyJWT, getMyNotices);
router.route('/posted').get(verifyJWT, getMyPostedNotices);
router.route('/:noticeId').get(verifyJWT, getNotice);

//posting routes
router.route('/').post(verifyJWT, verifyRole("admin", "superadmin", "faculty", "hod", "club_president"), upload.single('attachment'), createNotice);
router.route('/:noticeId').patch(verifyJWT, verifyRole("admin", "superadmin", "faculty", "hod", "club_president"), updateNotice);
router.route('/:noticeId').delete(verifyJWT, verifyRole("admin", "superadmin", "faculty", "hod", "club_president"), deleteNotice);

//admin only
router.route('/').get(verifyJWT, verifyRole("admin", "superadmin"), getAllNotices);

export default router;