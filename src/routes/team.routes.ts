import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { P } from "../constants/permissions.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get("/members", requirePermission(P.USERS_READ), async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10),
      search: z.string().trim().optional(),
      departmentId: z.string().min(1).optional(),
      roleId: z.string().min(1).optional(),
      status: z.enum(["active", "inactive"]).optional(),
      sortBy: z
        .enum(["name", "username", "employeeCode", "createdAt"])
        .default("createdAt"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
    })
    .parse(req.query);

  const term = query.search?.trim();
  const scopeSet = req.departmentScopeIds?.length
    ? new Set(req.departmentScopeIds)
    : null;
  let departmentFilter:
    | { departmentId: string | { in: string[] } }
    | Record<string, never> = {};
  if (scopeSet && query.departmentId) {
    departmentFilter = scopeSet.has(query.departmentId)
      ? { departmentId: query.departmentId }
      : { departmentId: { in: [] } };
  } else if (scopeSet) {
    departmentFilter = { departmentId: { in: [...scopeSet] } };
  } else if (query.departmentId) {
    departmentFilter = { departmentId: query.departmentId };
  }

  const where = {
    tenantId: req.tenantId!,
    ...departmentFilter,
    ...(query.roleId ? { roleId: query.roleId } : {}),
    ...(query.status
      ? { isActive: query.status === "active" ? true : false }
      : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term } },
            { username: { contains: term } },
            { employeeCode: { contains: term } },
          ],
        }
      : {}),
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
        username: true,
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
