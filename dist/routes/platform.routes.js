import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requirePlatformUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import * as platformService from "../services/platform.service.js";
const router = Router();
router.use(authMiddleware, requirePlatformUser);
router.get("/tenants", requirePermission("platform.tenant.list"), async (_req, res) => {
    const tenants = await platformService.listTenants();
    res.json({ tenants });
});
router.post("/tenants", requirePermission("platform.tenant.create"), async (req, res) => {
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
        const { tenant } = await platformService.createTenantWithInvitation(body);
        res.status(201).json({ tenant });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
export default router;
//# sourceMappingURL=platform.routes.js.map