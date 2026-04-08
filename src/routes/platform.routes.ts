import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePlatformUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import * as platformService from "../services/platform.service.js";
import * as platformDashboardService from "../services/platformDashboard.service.js";

const router = Router();

router.use(authMiddleware, requirePlatformUser);

router.get(
  "/tenants",
  requirePermission("platform.tenant.list"),
  async (req, res) => {
    const q = z
      .object({
        page: z.preprocess(
          (v) => (v === undefined || v === "" ? 1 : v),
          z.coerce.number().int().min(1),
        ),
        pageSize: z.preprocess(
          (v) => (v === undefined || v === "" ? 10 : v),
          z.coerce.number().int().min(1).max(200),
        ),
        search: z
          .string()
          .optional()
          .transform((s) =>
            s && String(s).trim() ? String(s).trim() : undefined,
          ),
        sortBy: z.enum(["createdAt", "name", "users"]).default("createdAt"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      })
      .parse(req.query);

    const result = await platformService.listTenantsPaginated({
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      sortBy: q.sortBy,
      sortDir: q.sortDir,
    });
    res.json(result);
  },
);

router.get(
  "/dashboard",
  requirePermission("platform.tenant.list"),
  async (_req, res) => {
    const dashboard = await platformDashboardService.getPlatformDashboard();
    res.json(dashboard);
  },
);

router.post(
  "/tenants",
  requirePermission("platform.tenant.create"),
  async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        slug: z
          .string()
          .min(2)
          .regex(/^[a-z0-9-]+$/),
        adminEmail: z.string().email(),
      })
      .parse(req.body);
    try {
      const { tenant, inviteLink } =
        await platformService.createTenantWithInvitation(body);
      res.status(201).json({ tenant, inviteLink });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

router.patch(
  "/tenants/:id/status",
  requirePermission("platform.tenant.manage"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["INVITED", "ACTIVE", "INACTIVE"]),
      })
      .parse(req.body);
    const tenant = await platformService.setTenantStatus({
      tenantId: params.id,
      status: body.status,
    });
    res.json({ tenant });
  },
);

router.post(
  "/tenants/:id/reinvite",
  requirePermission("platform.tenant.manage"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const result = await platformService.reinviteTenantAdmin({
      tenantId: params.id,
    });
    res.json(result);
  },
);

router.delete(
  "/tenants/:id",
  requirePermission("platform.tenant.manage"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    try {
      const result = await platformService.deleteTenant({ tenantId: params.id });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

export default router;
