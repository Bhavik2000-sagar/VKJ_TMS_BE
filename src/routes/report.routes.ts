import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { P } from "../constants/permissions.js";
import * as reportService from "../services/report.service.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get("/dashboard", requirePermission(P.REPORTS_READ), async (req, res) => {
  const stats = await reportService.dashboardStats(
    req.userId!,
    req.tenantId!,
    req.departmentScopeIds,
  );
  res.json(stats);
});

router.get("/by-assignee", requirePermission(P.REPORTS_READ), async (req, res) => {
  const rows = await reportService.taskSummaryByUser(
    req.tenantId!,
    req.departmentScopeIds,
  );
  res.json({ rows });
});

export default router;
