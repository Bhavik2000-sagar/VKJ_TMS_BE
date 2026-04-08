import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import * as reportService from "../services/report.service.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get("/dashboard", requirePermission("report.view"), async (req, res) => {
  const stats = await reportService.dashboardStats(req.userId!, req.tenantId!);
  res.json(stats);
});

router.get("/by-assignee", requirePermission("report.view"), async (req, res) => {
  const rows = await reportService.taskSummaryByUser(req.tenantId!);
  res.json({ rows });
});

export default router;
