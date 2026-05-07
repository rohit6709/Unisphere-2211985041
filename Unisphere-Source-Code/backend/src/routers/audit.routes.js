import { Router } from "express";
import { getGlobalAuditLogs, exportGlobalAuditLogs } from "../controllers/audit.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyRole } from "../middlewares/role.middleware.js";

const auditRouter = Router();

auditRouter.use(verifyJWT, verifyRole("admin", "superadmin"));

auditRouter.route("/logs").get(getGlobalAuditLogs);
auditRouter.route("/logs/export").get(exportGlobalAuditLogs);

export default auditRouter;
