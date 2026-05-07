import { Router } from 'express';
import { getClubProfile } from '../controllers/clubProfile.controller.js';

const clubProfileRouter = Router();

clubProfileRouter.route('/:clubId/profile').get(getClubProfile);

export default clubProfileRouter;