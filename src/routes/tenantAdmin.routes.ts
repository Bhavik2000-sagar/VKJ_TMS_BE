import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { prisma } from "../lib/prisma.js";
import {
  ensureTenantHierarchyRoles,
  TENANT_ASSIGNABLE_ROLE_CODES,
} from "../services/tenantBootstrap.service.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get("/users", requirePermission("user.manage"), async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10),
      search: z.string().trim().optional(),
      sortBy: z
        .enum(["name", "email", "employeeCode", "createdAt"])
        .default("createdAt"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
    })
    .parse(req.query);

  const term = query.search?.trim();
  const where = {
    tenantId: req.tenantId!,
    ...(term
      ? {
          OR: [
            { name: { contains: term } },
            { email: { contains: term } },
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
        email: true,
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

router.post("/users", requirePermission("user.manage"), async (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
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
  if (!roleRow || !TENANT_ASSIGNABLE_ROLE_CODES.includes(roleRow.code)) {
    res.status(400).json({ error: "Invalid role for user creation" });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: req.tenantId!,
      email: body.email,
      name: body.name,
      passwordHash,
      roleId: body.roleId,
      managerId: body.managerId,
      branchId: body.branchId ?? null,
      departmentId: body.departmentId ?? null,
      employeeCode: body.employeeCode ?? null,
      phone: body.phone ?? null,
      birthDate: body.birthDate ?? null,
    },
    include: { role: true },
  });
  res.status(201).json({ user });
});

router.get("/users/:id", requirePermission("user.manage"), async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).parse(req.params);
  const user = await prisma.user.findFirst({
    where: { id: params.id, tenantId: req.tenantId! },
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
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

router.patch(
  "/users/:id",
  requirePermission("user.manage"),
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

    if (body.roleId) {
      const roleRow = await prisma.role.findFirst({
        where: { id: body.roleId, tenantId: req.tenantId! },
      });
      if (!roleRow || !TENANT_ASSIGNABLE_ROLE_CODES.includes(roleRow.code)) {
        res.status(400).json({ error: "Invalid role for user update" });
        return;
      }
    }

    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId: req.tenantId! },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
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
    });

    res.json({ user });
  },
);

router.patch(
  "/users/:id/status",
  requirePermission("user.manage"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z.object({ isActive: z.boolean() }).parse(req.body);

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
  requirePermission("user.manage"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);

    if (params.id === req.user!.id) {
      res.status(400).json({ error: "You cannot delete your own user" });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id: params.id, tenantId: req.tenantId! },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id: params.id } });
    res.status(204).send();
  },
);

router.get(
  "/permissions-catalog",
  requirePermission("user.manage"),
  async (_req, res) => {
    const permissions = await prisma.permission.findMany({
      orderBy: { module: "asc" },
    });
    res.json({ permissions });
  },
);

router.get("/roles", requirePermission("user.manage"), async (req, res) => {
  const q = z
    .object({
      for: z.enum(["all", "assignment"]).optional(),
    })
    .parse(req.query);

  if (q.for === "assignment") {
    await ensureTenantHierarchyRoles(req.tenantId!);
  }

  const where =
    q.for === "assignment"
      ? {
          tenantId: req.tenantId!,
          code: { in: [...TENANT_ASSIGNABLE_ROLE_CODES] },
        }
      : { tenantId: req.tenantId! };

  const roles = await prisma.role.findMany({
    where,
    include: {
      rolePermissions: { include: { permission: true } },
    },
  });

  if (q.for === "assignment") {
    const order = [...TENANT_ASSIGNABLE_ROLE_CODES];
    roles.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  }

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
      tenantId: req.tenantId!,
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

router.get(
  "/permissions",
  requirePermission("role.manage"),
  async (_req, res) => {
    const permissions = await prisma.permission.findMany({
      orderBy: { module: "asc" },
    });
    res.json({ permissions });
  },
);

export default router;
