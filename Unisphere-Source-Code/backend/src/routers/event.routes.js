import { Router } from "express";
import { createEvent, submitEvent, updateEvent, reviewEvent, cancelEvent, getClubEvents, getPendingEvents, getEvent, getEventLogs, getAllEvents, getPublicEvents, getPublicEvent, getMySubmittedEvents, getAdviseePendingEvents, toggleFeatured, deleteEvent, getGlobalPendingRequests } from "../controllers/event.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRole } from "../middlewares/role.middleware.js";
import { verifyClubAccess, requireClubRole } from "../middlewares/verifyClubAccess.middleware.js";
import { simpleCache } from "../middlewares/cache.middleware.js";
import eventGroupRouter from "./eventGroup.routes.js";


export const clubEventRouter = Router({ mergeParams: true });

clubEventRouter.use(verifyJWT, verifyClubAccess);

clubEventRouter.use("/:eventId/group", eventGroupRouter);

clubEventRouter.route("/pending").get(requireClubRole("advisor", "admin", "hod"), getPendingEvents);

clubEventRouter.route("/").get(getClubEvents).post(requireClubRole("president", "vicePresident", "admin"), createEvent);

clubEventRouter.route("/:eventId/submit").patch(requireClubRole("president", "vicePresident", "admin"), submitEvent);
clubEventRouter.route("/:eventId/update").patch(requireClubRole("president", "vicePresident", "admin"), updateEvent);

clubEventRouter.route("/:eventId/review").patch(requireClubRole("advisor", "admin", "hod"), reviewEvent);
clubEventRouter.route("/:eventId/logs").get(requireClubRole("advisor", "admin"), getEventLogs);

clubEventRouter.route("/:eventId/cancel").patch(requireClubRole("president", "vicePresident", "advisor", "admin"), cancelEvent);

clubEventRouter.route("/:eventId").get(getEvent);

const eventRouter = Router();

eventRouter.route("/all-events").get(verifyJWT, verifyRole("admin", "superadmin"), getAllEvents);
eventRouter.route("/pending-requests").get(verifyJWT, verifyRole("admin", "superadmin", "faculty", "hod"), getGlobalPendingRequests);
eventRouter.route("/my-submitted").get(verifyJWT, verifyRole("student", "club_president", "club_vice_president", "admin", "superadmin"), getMySubmittedEvents);
eventRouter.route("/advisee-pending").get(verifyJWT, verifyRole("faculty", "hod", "admin", "superadmin"), getAdviseePendingEvents);

eventRouter.route("/public").get(verifyJWT, simpleCache(120), getPublicEvents);
eventRouter.route("/public/:eventId").get(verifyJWT, simpleCache(300), getPublicEvent);

eventRouter.route("/:eventId/toggle-featured").patch(verifyJWT, verifyRole("admin", "superadmin"), toggleFeatured);

eventRouter.route("/:eventId").delete(verifyJWT, verifyRole("admin", "superadmin"), deleteEvent);

export default eventRouter;
