import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { prisma } from "../lib/prisma.js";
const router = Router();
router.use(authMiddleware, requireTenantUser);
router.get("/members", requirePermission("team.view"), async (req, res) => {
    const users = await prisma.user.findMany({
        where: { tenantId: req.tenantId },
        select: {
            id: true,
            email: true,
            name: true,
            managerId: true,
            role: { select: { code: true, name: true } },
        },
    });
    res.json({ members: users });
});
export default router;
//# sourceMappingURL=team.routes.js.map