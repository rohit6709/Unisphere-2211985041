import { Router } from "express";
import { updateClubTags, getClubTags } from "../controllers/clubTags.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyClubAccess, requireClubRole } from "../middlewares/verifyClubAccess.middleware.js";


const clubTagsRouter = Router();

clubTagsRouter.route('/:clubId/tags').get(getClubTags);

clubTagsRouter.route('/:clubId/tags').patch(verifyJWT, verifyClubAccess, requireClubRole("advisor", "admin"), updateClubTags);

export default clubTagsRouter;