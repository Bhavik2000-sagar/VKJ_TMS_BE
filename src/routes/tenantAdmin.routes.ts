import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../middleware/permission.middleware.js";
import { prisma } from "../lib/prisma.js";
import {
  assertActorMayAssignRole,
  ensureTenantPrimaryAdminRole,
  getTenantPrimaryAdminRole,
} from "../services/tenantBootstrap.service.js";
import {
  matrixSelectionsToKeys,
  keysToMatrixSelections,
  keysToRolePermissionRows,
  KNOWN_PERMISSION_KEYS,
  PERMISSION_MATRIX_ACTIONS,
  PERMISSION_MATRIX_MODULES,
  permissionKey,
  P,
} from "../constants/permissions.js";
import { usernameSchema } from "../utils/username.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

function assertCallerGrants(
  caller: Set<string> | undefined,
  requested: string[],
  res: Response,
): boolean {
  if (!caller) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  for (const k of requested) {
    if (!caller.has(k)) {
      res.status(403).json({
        error: "Cannot grant permissions you do not have",
        key: k,
      });
      return false;
    }
  }
  return true;
}

function assertKeysKnown(keys: string[], res: Response): boolean {
  for (const k of keys) {
    if (!KNOWN_PERMISSION_KEYS.has(k)) {
      res.status(400).json({ error: "Unknown permission key", key: k });
      return false;
    }
  }
  return true;
}

function resolveRequestedKeys(body: {
  permissions?: { module: string; action: string }[];
  permissionKeys?: string[];
}): string[] {
  const keys: string[] = [];
  if (body.permissions?.length) {
    keys.push(...matrixSelectionsToKeys(body.permissions));
  }
  if (body.permissionKeys?.length) {
    keys.push(...body.permissionKeys);
  }
  return [...new Set(keys)];
}

router.get("/users", requirePermission(P.USERS_READ), async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10),
      search: z.string().trim().optional(),
      sortBy: z
        .enum(["name", "username", "employeeCode", "createdAt"])
        .default("createdAt"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
    })
    .parse(req.query);

  const term = query.search?.trim();
  const where = {
    tenantId: req.tenantId!,
    ...(req.departmentScopeIds?.length
      ? { departmentId: { in: req.departmentScopeIds } }
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
  } as const;

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
        branchId: true,
        departmentId: true,
        employeeCode: true,
        phone: true,
        birthDate: true,
        createdAt: true,
        role: { select: { id: true, code: true, name: true } },
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

router.post("/users", requirePermission(P.USERS_CREATE), async (req, res) => {
  const body = z
    .object({
      username: usernameSchema,
      name: z.string().min(1),
      password: z.string().min(8),
      roleId: z.string(),
      managerId: z.string().optional().nullable(),
      branchId: z.string().optional().nullable(),
      departmentId: z.string().optional().nullable(),
      employeeCode: z.string().trim().min(1).max(60).optional().nullable(),
      phone: z.string().trim().min(1).max(40).optional().nullable(),
      birthDate: z.coerce.date().optional().nullable(),
    })
    .parse(req.body);

  const roleRow = await prisma.role.findFirst({
    where: { id: body.roleId, tenantId: req.tenantId! },
  });
  if (!roleRow) {
    res.status(400).json({ error: "Invalid role for user creation" });
    return;
  }

  const assignCheck = await assertActorMayAssignRole({
    tenantId: req.tenantId!,
    actorRoleId: req.user!.roleId,
    targetRoleId: roleRow.id,
  });
  if (!assignCheck.ok) {
    res.status(assignCheck.status).json({ error: assignCheck.error });
    return;
  }

  const creatorDeptId = req.user?.role?.departmentId ?? null;
  if (creatorDeptId) {
    if (roleRow.departmentId !== creatorDeptId) {
      res
        .status(400)
        .json({ error: "Role not available in your department scope" });
      return;
    }
    if (body.departmentId && body.departmentId !== creatorDeptId) {
      res
        .status(400)
        .json({ error: "User department must stay within your scope" });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: req.tenantId!,
      username: body.username,
      name: body.name,
      passwordHash,
      roleId: body.roleId,
      managerId: body.managerId,
      branchId: body.branchId ?? null,
      departmentId: body.departmentId ?? (creatorDeptId ? creatorDeptId : null),
      employeeCode: body.employeeCode ?? null,
      phone: body.phone ?? null,
      birthDate: body.birthDate ?? null,
    },
    include: { role: true },
  });
  res.status(201).json({ user });
});

router.get("/users/:id", requirePermission(P.USERS_READ), async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).parse(req.params);
  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: req.tenantId! },
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
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (
    req.departmentScopeIds?.length &&
    user.departmentId &&
    !req.departmentScopeIds.includes(user.departmentId)
  ) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

router.patch(
  "/users/:id",
  requirePermission(P.USERS_UPDATE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        roleId: z.string().min(1).optional(),
        managerId: z.string().optional().nullable(),
        departmentId: z.string().optional().nullable(),
        employeeCode: z.string().trim().min(1).max(60).optional().nullable(),
        phone: z.string().trim().min(1).max(40).optional().nullable(),
        birthDate: z.coerce.date().optional().nullable(),
      })
      .parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId: req.tenantId! },
      select: { id: true, departmentId: true },
    });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (
      req.departmentScopeIds?.length &&
      existing.departmentId &&
      !req.departmentScopeIds.includes(existing.departmentId)
    ) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (body.roleId) {
      const roleRow = await prisma.role.findFirst({
        where: { id: body.roleId, tenantId: req.tenantId! },
      });
      if (!roleRow) {
        res.status(400).json({ error: "Invalid role for user update" });
        return;
      }
      const assignCheck = await assertActorMayAssignRole({
        tenantId: req.tenantId!,
        actorRoleId: req.user!.roleId,
        targetRoleId: roleRow.id,
      });
      if (!assignCheck.ok) {
        res.status(assignCheck.status).json({ error: assignCheck.error });
        return;
      }
      const creatorDeptId = req.user?.role?.departmentId ?? null;
      if (creatorDeptId && roleRow.departmentId !== creatorDeptId) {
        res
          .status(400)
          .json({ error: "Role not available in your department scope" });
        return;
      }
    }

    if (body.departmentId !== undefined) {
      const creatorDeptId = req.user?.role?.departmentId ?? null;
      if (
        creatorDeptId &&
        body.departmentId &&
        body.departmentId !== creatorDeptId
      ) {
        res
          .status(400)
          .json({ error: "User department must stay within your scope" });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.roleId !== undefined ? { roleId: body.roleId } : {}),
        ...(body.managerId !== undefined ? { managerId: body.managerId } : {}),
        ...(body.departmentId !== undefined
          ? { departmentId: body.departmentId }
          : {}),
        ...(body.employeeCode !== undefined
          ? { employeeCode: body.employeeCode }
          : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.birthDate !== undefined ? { birthDate: body.birthDate } : {}),
      },
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
    });

    res.json({ user });
  },
);

router.patch(
  "/users/:id/status",
  requirePermission(P.USERS_UPDATE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z.object({ isActive: z.boolean() }).parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId: req.tenantId! },
      select: { id: true, departmentId: true },
    });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (
      req.departmentScopeIds?.length &&
      existing.departmentId &&
      !req.departmentScopeIds.includes(existing.departmentId)
    ) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: body.isActive },
      select: {
        id: true,
        isActive: true,
      },
    });

    res.json({ user });
  },
);

router.delete(
  "/users/:id",
  requirePermission(P.USERS_DELETE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);

    if (params.id === req.user!.id) {
      res.status(400).json({ error: "You cannot delete your own user" });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId: req.tenantId! },
      select: { id: true, departmentId: true },
    });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (
      req.departmentScopeIds?.length &&
      existing.departmentId &&
      !req.departmentScopeIds.includes(existing.departmentId)
    ) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id: params.id } });
    res.status(204).send();
  },
);

router.get(
  "/permission-matrix-def",
  requireAnyPermission([
    P.USERS_CREATE,
    P.USERS_UPDATE,
    P.ROLES_READ,
    P.ROLES_CREATE,
    P.ROLES_UPDATE,
    P.ROLES_DELETE,
  ]),
  (_req, res) => {
    res.json({
      modules: [...PERMISSION_MATRIX_MODULES],
      actions: [...PERMISSION_MATRIX_ACTIONS],
    });
  },
);

router.get(
  "/permissions-catalog",
  requireAnyPermission([
    P.ROLES_READ,
    P.ROLES_CREATE,
    P.ROLES_UPDATE,
    P.ROLES_DELETE,
  ]),
  (_req, res) => {
    res.json({
      permissions: [...KNOWN_PERMISSION_KEYS].sort().map((key) => {
        const [module, action] = key.split(".");
        return { key, module, action };
      }),
    });
  },
);

const roleInclude = {
  rolePermissions: true,
} as const;

function serializeRole(role: {
  id: string;
  tenantId: string | null;
  departmentId: string | null;
  code: string;
  name: string;
  isSystem: boolean;
  rolePermissions: { module: string; action: string }[];
}) {
  const keys = role.rolePermissions.map((rp) =>
    permissionKey(rp.module, rp.action),
  );
  return {
    ...role,
    permissionKeys: keys,
    matrixSelections: keysToMatrixSelections(keys),
  };
}

router.get("/roles", async (req, res) => {
  const q = z
    .object({
      for: z.enum(["all", "assignment"]).optional(),
    })
    .parse(req.query);

  if (q.for === "assignment") {
    if (
      !req.effectivePermissions?.has(P.USERS_CREATE) &&
      !req.effectivePermissions?.has(P.USERS_UPDATE)
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await ensureTenantPrimaryAdminRole(req.tenantId!);
    const primary = await getTenantPrimaryAdminRole(req.tenantId!);
    const creatorDeptId = req.user?.role?.departmentId ?? null;
    const roles = await prisma.role.findMany({
      where: {
        tenantId: req.tenantId!,
        ...(creatorDeptId ? { departmentId: creatorDeptId } : {}),
      },
      include: roleInclude,
    });

    roles.sort((a, b) => {
      const aPrimary = primary && a.id === primary.id ? 0 : 1;
      const bPrimary = primary && b.id === primary.id ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;
      return a.name.localeCompare(b.name);
    });
    res.json({ roles: roles.map(serializeRole) });
    return;
  }

  if (
    !req.effectivePermissions?.has(P.ROLES_READ) &&
    !req.effectivePermissions?.has(P.ROLES_CREATE) &&
    !req.effectivePermissions?.has(P.ROLES_UPDATE) &&
    !req.effectivePermissions?.has(P.ROLES_DELETE)
  ) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const roles = await prisma.role.findMany({
    where: { tenantId: req.tenantId! },
    include: roleInclude,
  });

  res.json({ roles: roles.map(serializeRole) });
});

const roleBodySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  departmentId: z.string().min(1).optional().nullable(),
  permissions: z
    .array(z.object({ module: z.string().min(1), action: z.string().min(1) }))
    .optional(),
  permissionKeys: z.array(z.string().min(1)).optional(),
});

router.post("/roles", requirePermission(P.ROLES_CREATE), async (req, res) => {
  const body = roleBodySchema.parse(req.body);
  const keys = resolveRequestedKeys(body);
  if (keys.length === 0) {
    res.status(400).json({ error: "At least one permission is required" });
    return;
  }
  if (!assertKeysKnown(keys, res)) return;
  if (!assertCallerGrants(req.effectivePermissions, keys, res)) return;

  const creatorDeptId = req.user?.role?.departmentId ?? null;
  let departmentId: string | null = body.departmentId ?? null;
  if (creatorDeptId) {
    departmentId = creatorDeptId;
  }
  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, tenantId: req.tenantId! },
    });
    if (!dept) {
      res.status(400).json({ error: "Invalid department" });
      return;
    }
  }

  const rows = keysToRolePermissionRows(keys);
  const role = await prisma.role.create({
    data: {
      tenantId: req.tenantId!,
      code: body.code,
      name: body.name,
      isSystem: false,
      departmentId,
      rolePermissions: { create: rows },
    },
    include: roleInclude,
  });
  res.status(201).json({ role: serializeRole(role) });
});

router.patch(
  "/roles/:id",
  requirePermission(P.ROLES_UPDATE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        name: z.string().min(1).optional(),
        departmentId: z.string().min(1).optional().nullable(),
        permissions: z
          .array(
            z.object({ module: z.string().min(1), action: z.string().min(1) }),
          )
          .optional(),
        permissionKeys: z.array(z.string().min(1)).optional(),
      })
      .parse(req.body);

    const existing = await prisma.role.findFirst({
      where: { id: params.id, tenantId: req.tenantId! },
      include: roleInclude,
    });
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const creatorDeptId = req.user?.role?.departmentId ?? null;
    if (
      creatorDeptId &&
      existing.departmentId &&
      existing.departmentId !== creatorDeptId
    ) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    let departmentId = existing.departmentId;
    if (body.departmentId !== undefined) {
      if (creatorDeptId && body.departmentId !== creatorDeptId) {
        res.status(400).json({ error: "Invalid department for your scope" });
        return;
      }
      departmentId = body.departmentId;
      if (departmentId) {
        const dept = await prisma.department.findFirst({
          where: { id: departmentId, tenantId: req.tenantId! },
        });
        if (!dept) {
          res.status(400).json({ error: "Invalid department" });
          return;
        }
      }
    }

    const keys =
      body.permissions !== undefined || body.permissionKeys !== undefined
        ? resolveRequestedKeys({
            permissions: body.permissions,
            permissionKeys: body.permissionKeys,
          })
        : null;

    if (keys !== null && keys.length > 0) {
      if (!assertKeysKnown(keys, res)) return;
      if (!assertCallerGrants(req.effectivePermissions, keys, res)) return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (keys !== null) {
        await tx.rolePermission.deleteMany({ where: { roleId: params.id } });
        const rows = keysToRolePermissionRows(keys);
        if (rows.length) {
          await tx.rolePermission.createMany({
            data: rows.map((r) => ({ roleId: params.id, ...r })),
          });
        }
      }
      return tx.role.update({
        where: { id: params.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.departmentId !== undefined ? { departmentId } : {}),
        },
        include: roleInclude,
      });
    });

    res.json({ role: serializeRole(updated) });
  },
);

router.get("/permissions", requirePermission(P.ROLES_READ), (_req, res) => {
  res.json({
    permissions: [...KNOWN_PERMISSION_KEYS].sort().map((key) => {
      const [module, action] = key.split(".");
      return { key, module, action };
    }),
  });
});

export default router;
