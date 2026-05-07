import { Router } from 'express';
import { getStudentDashboard } from '../controllers/dashboard.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyRole } from '../middlewares/role.middleware.js';

const dashboardRouter = Router();

dashboardRouter.route('/dashboard').get(verifyJWT, verifyRole("student", "club_president", "club_vice_president"), getStudentDashboard);

export default dashboardRouter;