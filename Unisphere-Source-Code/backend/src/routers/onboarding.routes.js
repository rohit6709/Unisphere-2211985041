import { Router } from 'express';
import {
    saveInterests,
    getClubRecommendations,
    updateInterests,
    getInterestCategories
} from '../controllers/onboarding.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyRole } from '../middlewares/role.middleware.js';

const onboardingRouter = Router();

onboardingRouter.route("/interest-categories").get(getInterestCategories);

onboardingRouter.route("/onboarding").post(verifyJWT, verifyRole("student", "club_president", "club_vice_president"), saveInterests);
onboardingRouter.route("/club-recommendations").get(verifyJWT, verifyRole("student", "club_president", "club_vice_president"), getClubRecommendations);
onboardingRouter.route("/interests").patch(verifyJWT, verifyRole("student", "club_president", "club_vice_president"), updateInterests);

export default onboardingRouter;