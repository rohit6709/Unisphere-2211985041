import { Router } from "express";
import { registerForEvent, unregisterFromEvent, getEventRegistrations, getMyRegistrations, getAllRegistrations, exportRegistrations, updateRegistrationStatus, bulkUpdateRegistrationStatus } from "../controllers/registration.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRole } from "../middlewares/role.middleware.js"; 

const registrationRouter = Router();

registrationRouter.route("/my-registrations").get(verifyJWT, verifyRole("student", "club_president", "club_vice_president"), getMyRegistrations);
registrationRouter.route("/all").get(verifyJWT, verifyRole("admin", "superadmin"), getAllRegistrations);

registrationRouter.route("/:eventId/register").post(verifyJWT, verifyRole("student", "club_president", "club_vice_president"), registerForEvent);
registrationRouter.route("/:eventId/unregister").delete(verifyJWT, verifyRole("student", "club_president", "club_vice_president"), unregisterFromEvent);

registrationRouter.route("/:eventId/registrations").get(verifyJWT, verifyRole("admin", "superadmin", "faculty", "hod"), getEventRegistrations);
registrationRouter.route("/:eventId/registrations/bulk-status").patch(verifyJWT, verifyRole("admin", "superadmin"), bulkUpdateRegistrationStatus);
registrationRouter.route("/:eventId/registrations/:registrationId/status").patch(verifyJWT, verifyRole("admin", "superadmin"), updateRegistrationStatus);
registrationRouter.route("/:eventId/export").get(verifyJWT, verifyRole("admin", "superadmin", "faculty", "hod"), exportRegistrations);

export default registrationRouter;
