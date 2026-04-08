import { Router } from "express";
import { z } from "zod";
import { authMiddleware, requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import { createBranch, createDepartment, deleteBranch, deleteDepartment, listBranches, listDepartments, updateBranch, updateDepartment, } from "../services/org.service.js";
const router = Router();
router.use(authMiddleware, requireTenantUser);
const MANAGE_ORG = requirePermission("org.manage");
router.get("/branches", MANAGE_ORG, async (req, res) => {
    const branches = await listBranches(req.tenantId);
    res.json({ branches });
});
router.post("/branches", MANAGE_ORG, async (req, res) => {
    const body = z
        .object({
        name: z.string().min(1).max(120),
        code: z.string().min(1).max(50).optional().nullable(),
    })
        .parse(req.body);
    const branch = await createBranch({
        tenantId: req.tenantId,
        name: body.name,
        code: body.code,
    });
    res.status(201).json({ branch });
});
router.patch("/branches/:id", MANAGE_ORG, async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
        .object({
        name: z.string().min(1).max(120).optional(),
        code: z.string().min(1).max(50).optional().nullable(),
    })
        .parse(req.body);
    const branch = await updateBranch({
        tenantId: req.tenantId,
        id: params.id,
        name: body.name,
        code: body.code,
    });
    res.json({ branch });
});
router.delete("/branches/:id", MANAGE_ORG, async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    await deleteBranch(req.tenantId, params.id);
    res.status(204).send();
});
router.get("/departments", MANAGE_ORG, async (req, res) => {
    const query = z
        .object({
        branchId: z.string().min(1).optional(),
    })
        .parse(req.query);
    const departments = await listDepartments(req.tenantId, query.branchId);
    res.json({ departments });
});
router.post("/departments", MANAGE_ORG, async (req, res) => {
    const body = z
        .object({
        name: z.string().min(1).max(120),
        code: z.string().min(1).max(50).optional().nullable(),
        branchId: z.string().min(1).optional().nullable(),
    })
        .parse(req.body);
    const department = await createDepartment({
        tenantId: req.tenantId,
        name: body.name,
        code: body.code,
        branchId: body.branchId,
    });
    res.status(201).json({ department });
});
router.patch("/departments/:id", MANAGE_ORG, async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
        .object({
        name: z.string().min(1).max(120).optional(),
        code: z.string().min(1).max(50).optional().nullable(),
        branchId: z.string().min(1).optional().nullable(),
    })
        .parse(req.body);
    const department = await updateDepartment({
        tenantId: req.tenantId,
        id: params.id,
        name: body.name,
        code: body.code,
        branchId: body.branchId,
    });
    res.json({ department });
});
router.delete("/departments/:id", MANAGE_ORG, async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    await deleteDepartment(req.tenantId, params.id);
    res.status(204).send();
});
export default router;
//# sourceMappingURL=org.routes.js.map