import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { prisma } from "../lib/prisma.js";
import { ensureTenantHierarchyRoles } from "../services/tenantBootstrap.service.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get("/members", requirePermission("team.view"), async (req, res) => {
  await ensureTenantHierarchyRoles(req.tenantId!);

  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10),
      search: z.string().trim().optional(),
      departmentId: z.string().min(1).optional(),
      roleId: z.string().min(1).optional(),
      status: z.enum(["active", "inactive"]).optional(),
      sortBy: z
        .enum(["name", "email", "employeeCode", "createdAt"])
        .default("createdAt"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
    })
    .parse(req.query);

  const requesterRoleCode = req.user?.role?.code ?? null;
  const roleScope =
    requesterRoleCode === "ADMIN"
      ? null
      : requesterRoleCode === "VP_GM"
        ? (["MANAGER", "STAFF", "SUPPORTER"] as const)
        : requesterRoleCode === "MANAGER"
          ? (["STAFF", "SUPPORTER"] as const)
          : null;

  const term = query.search?.trim();
  const baseWhere = {
    tenantId: req.tenantId!,
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.roleId ? { roleId: query.roleId } : {}),
    ...(query.status
      ? { isActive: query.status === "active" ? true : false }
      : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term } },
            { email: { contains: term } },
            { employeeCode: { contains: term } },
          ],
        }
      : {}),
  };

  // Role-based visibility (admin sees all).
  // VP_GM: MANAGER/STAFF/SUPPORTER
  // MANAGER: STAFF/SUPPORTER
  // Always include self so the logged-in user doesn't disappear from the list.
  const where =
    roleScope == null
      ? baseWhere
      : {
          ...baseWhere,
          OR: [
            { id: req.user!.id },
            { role: { code: { in: [...roleScope] } } },
          ],
        };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        managerId: true,
        departmentId: true,
        employeeCode: true,
        phone: true,
        birthDate: true,
        createdAt: true,
        role: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    }),
  ]);

  res.json({
    items: users,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  });
});

export default router;
