import { Router } from 'express';
import {
    createClub,
    requestClub,
    updateClub,
    reviewClubRequest,
    assignPresident,
    assignVicePresident,
    assignAdvisor,
    removeAdvisor,
    joinClub,
    leaveClub,
    removeMember,
    getAllClubs,
    getClub,
    getPendingClubs,
    getMyClubs,
    getMyAdvisedClubs,
    getClubMembers,
    toggleClubStatus
} from '../controllers/club.controller.js';

import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyRole } from '../middlewares/role.middleware.js';

const router = Router();

// Admin, Faculty, Student
router.route('/get-all-clubs').get(verifyJWT, getAllClubs);
router.route('/admin/pending-clubs').get(verifyJWT, verifyRole('admin', 'superadmin'), getPendingClubs);
router.route('/create-club').post(verifyJWT, verifyRole('admin', 'superadmin'), createClub);
router.route('/admin/:clubId/review-request').patch(verifyJWT, verifyRole('admin', 'superadmin'), reviewClubRequest);
router.route('/admin/:clubId/assign-advisor').patch(verifyJWT, verifyRole('admin', 'superadmin', 'hod'), assignAdvisor);
router.route('/admin/:clubId/toggle-status').patch(verifyJWT, verifyRole('admin', 'superadmin'), toggleClubStatus);
router.route('/admin/:clubId/remove-advisor').delete(verifyJWT, verifyRole('admin', 'superadmin', 'hod'), removeAdvisor);

//Facult + admin routes
router.route('/update-club/:clubId').patch(verifyJWT, verifyRole('admin', 'superadmin', 'faculty', 'hod'), updateClub);
router.route('/:clubId/assign-president').patch(verifyJWT, verifyRole('admin', 'superadmin', 'faculty', 'hod'), assignPresident);
router.route('/:clubId/assign-vice-president').patch(verifyJWT, verifyRole('admin', 'superadmin', 'faculty', 'hod'), assignVicePresident);
router.route('/:clubId/members').get(verifyJWT, verifyRole('admin', 'superadmin', 'faculty', 'hod', 'club_president'), getClubMembers);

// Faculty + president + admin
router.route('/:clubId/remove-member/:rollNo').delete(verifyJWT, verifyRole('admin', 'superadmin', 'faculty', 'hod', 'club_president'), removeMember);

// Faculty + HOD
router.route('/request-club').post(verifyJWT, verifyRole('faculty', 'hod'), requestClub);
router.route('/my-clubs').get(verifyJWT, verifyRole('student', 'club_president', 'club_vice_president'), getMyClubs);
router.route('/my-advised-clubs').get(verifyJWT, verifyRole('faculty', 'hod'), getMyAdvisedClubs);
router.route('/join-club/:clubId').post(verifyJWT, verifyRole('student', 'club_president', 'club_vice_president'), joinClub);
router.route('/leave-club/:clubId').post(verifyJWT, verifyRole('student', 'club_president', 'club_vice_president'), leaveClub);

// Faculty + student
router.route('/get-club/:clubId').get(verifyJWT, getClub);

export default router;
