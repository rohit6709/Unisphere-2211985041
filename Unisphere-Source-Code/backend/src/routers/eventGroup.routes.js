import { Router } from "express";
import { getEventGroup, getEventGroupMembers, leaveEventGroup } from "../controllers/eventGroup.controller.js";
import { verifyClubAccess, requireClubRole } from "../middlewares/verifyClubAccess.middleware.js";
import { verifyJWT } from  "../middlewares/auth.middleware.js";
const eventGroupRouter = Router({ mergeParams: true });

eventGroupRouter.route("/").get(getEventGroup);

eventGroupRouter.route("/members").get(getEventGroupMembers);

eventGroupRouter.route("/leave").delete(leaveEventGroup);

export default eventGroupRouter;