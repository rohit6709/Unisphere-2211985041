import { Router } from 'express';
import { loginWithEmail } from '../controllers/auth.controller.js';

const router = Router();

router.route('/login').post(loginWithEmail);

export default router;
