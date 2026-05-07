import { Router } from 'express';
import { submitFeedback, getEventFeedback } from '../controllers/feedback.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/:eventId').get(getEventFeedback);
router.route('/submit').post(verifyJWT, submitFeedback);

export default router;
