import { Router } from "express";
import { z } from "zod";
import {
  authMiddleware,
  requireTenantUser,
} from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { P } from "../constants/permissions.js";
import {
  createBranch,
  createDepartment,
  deleteBranch,
  deleteDepartment,
  listBranches,
  listDepartments,
  listDepartmentsPaginated,
  updateBranch,
  updateDepartment,
} from "../services/org.service.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get(
  "/branches",
  requirePermission(P.DEPARTMENTS_READ),
  async (req, res) => {
    const branches = await listBranches(req.tenantId!);
    res.json({ branches });
  },
);

router.post(
  "/branches",
  requirePermission(P.DEPARTMENTS_CREATE),
  async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).max(120),
        code: z.string().min(1).max(50).optional().nullable(),
      })
      .parse(req.body);
    const branch = await createBranch({
      tenantId: req.tenantId!,
      name: body.name,
      code: body.code,
    });
    res.status(201).json({ branch });
  },
);

router.patch(
  "/branches/:id",
  requirePermission(P.DEPARTMENTS_UPDATE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        name: z.string().min(1).max(120).optional(),
        code: z.string().min(1).max(50).optional().nullable(),
      })
      .parse(req.body);
    const branch = await updateBranch({
      tenantId: req.tenantId!,
      id: params.id,
      name: body.name,
      code: body.code,
    });
    res.json({ branch });
  },
);

router.delete(
  "/branches/:id",
  requirePermission(P.DEPARTMENTS_DELETE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    await deleteBranch(req.tenantId!, params.id);
    res.status(204).send();
  },
);

router.get(
  "/departments",
  requirePermission(P.DEPARTMENTS_READ),
  async (req, res) => {
    const query = z
      .object({
        branchId: z.string().min(1).optional(),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(100).optional(),
        search: z.string().trim().optional(),
        sortBy: z.enum(["name", "code", "createdAt"]).optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      })
      .parse(req.query);

    // Backwards compatible: without pagination params return full list.
    if (
      !query.page &&
      !query.pageSize &&
      !query.search &&
      !query.sortBy &&
      !query.sortDir
    ) {
      const departments = await listDepartments(req.tenantId!, query.branchId);
      res.json({ departments });
      return;
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? "createdAt";
    const sortDir = query.sortDir ?? "desc";

    const { items, total } = await listDepartmentsPaginated({
      tenantId: req.tenantId!,
      branchId: query.branchId,
      page,
      pageSize,
      search: query.search,
      sortBy,
      sortDir,
    });

    res.json({
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  },
);

router.post(
  "/departments",
  requirePermission(P.DEPARTMENTS_CREATE),
  async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).max(120),
        code: z.string().min(1).max(50).optional().nullable(),
        branchId: z.string().min(1).optional().nullable(),
      })
      .parse(req.body);
    const department = await createDepartment({
      tenantId: req.tenantId!,
      name: body.name,
      code: body.code,
      branchId: body.branchId,
    });
    res.status(201).json({ department });
  },
);

router.patch(
  "/departments/:id",
  requirePermission(P.DEPARTMENTS_UPDATE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        name: z.string().min(1).max(120).optional(),
        code: z.string().min(1).max(50).optional().nullable(),
        branchId: z.string().min(1).optional().nullable(),
      })
      .parse(req.body);
    const department = await updateDepartment({
      tenantId: req.tenantId!,
      id: params.id,
      name: body.name,
      code: body.code,
      branchId: body.branchId,
    });
    res.json({ department });
  },
);

router.delete(
  "/departments/:id",
  requirePermission(P.DEPARTMENTS_DELETE),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    await deleteDepartment(req.tenantId!, params.id);
    res.status(204).send();
  },
);

export default router;
