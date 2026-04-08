import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { prisma } from "../lib/prisma.js";
const router = Router();
router.use(authMiddleware, requireTenantUser);
router.get("/users", requirePermission("user.manage"), async (req, res) => {
    const users = await prisma.user.findMany({
        where: { tenantId: req.tenantId },
        select: {
            id: true,
            email: true,
            name: true,
            managerId: true,
            role: { select: { id: true, code: true, name: true } },
        },
    });
    res.json({ users });
});
router.post("/users", requirePermission("user.manage"), async (req, res) => {
    const body = z
        .object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(8),
        roleId: z.string(),
        managerId: z.string().optional().nullable(),
    })
        .parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
        data: {
            tenantId: req.tenantId,
            email: body.email,
            name: body.name,
            passwordHash,
            roleId: body.roleId,
            managerId: body.managerId,
        },
        include: { role: true },
    });
    res.status(201).json({ user });
});
router.get("/permissions-catalog", requirePermission("user.manage"), async (_req, res) => {
    const permissions = await prisma.permission.findMany({ orderBy: { module: "asc" } });
    res.json({ permissions });
});
router.get("/roles", requirePermission("role.manage"), async (req, res) => {
    const roles = await prisma.role.findMany({
        where: { tenantId: req.tenantId },
        include: {
            rolePermissions: { include: { permission: true } },
        },
    });
    res.json({ roles });
});
router.post("/roles", requirePermission("role.manage"), async (req, res) => {
    const body = z
        .object({
        code: z.string().min(1),
        name: z.string().min(1),
        permissionIds: z.array(z.string()),
    })
        .parse(req.body);
    const role = await prisma.role.create({
        data: {
            tenantId: req.tenantId,
            code: body.code,
            name: body.name,
            isSystem: false,
            rolePermissions: {
                create: body.permissionIds.map((id) => ({ permissionId: id })),
            },
        },
        include: { rolePermissions: { include: { permission: true } } },
    });
    res.status(201).json({ role });
});
router.get("/permissions", requirePermission("role.manage"), async (_req, res) => {
    const permissions = await prisma.permission.findMany({ orderBy: { module: "asc" } });
    res.json({ permissions });
});
export default router;
//# sourceMappingURL=tenantAdmin.routes.js.map