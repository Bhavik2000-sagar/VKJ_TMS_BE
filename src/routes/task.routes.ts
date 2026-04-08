import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import * as taskService from "../services/task.service.js";
import { prisma } from "../lib/prisma.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.use(authMiddleware, requireTenantUser);

router.get("/statuses", async (req, res) => {
  const tenantId = req.tenantId!;
  const statuses = await prisma.taskStatus.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });
  res.json({ statuses });
});

router.get(
  "/assignable-users",
  requirePermission("task.create"),
  async (req, res) => {
    const users = await prisma.user.findMany({
      where: { tenantId: req.tenantId! },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.json({ users });
  },
);

router.get("/", requirePermission("task.update"), async (req, res) => {
  const q = z
    .object({
      page: z.preprocess(
        (v) => (v === undefined || v === "" ? 1 : v),
        z.coerce.number().int().min(1),
      ),
      pageSize: z.preprocess(
        (v) => (v === undefined || v === "" ? 10 : v),
        z.coerce.number().transform((n) => (n === 20 || n === 50 ? n : 10)),
      ),
      statusId: z
        .string()
        .optional()
        .transform((s) =>
          s && String(s).trim() ? String(s).trim() : undefined,
        ),
      priority: z
        .string()
        .optional()
        .transform((s) =>
          s && String(s).trim() ? String(s).trim() : undefined,
        ),
      dueFrom: z
        .string()
        .optional()
        .transform((s) => {
          if (!s || !String(s).trim()) return undefined;
          const d = new Date(s);
          return Number.isNaN(d.getTime()) ? undefined : d;
        }),
      dueTo: z
        .string()
        .optional()
        .transform((s) => {
          if (!s || !String(s).trim()) return undefined;
          const d = new Date(s);
          return Number.isNaN(d.getTime()) ? undefined : d;
        }),
      search: z
        .string()
        .optional()
        .transform((s) =>
          s && String(s).trim() ? String(s).trim() : undefined,
        ),
      sortBy: z
        .enum([
          "title",
          "priority",
          "dueDate",
          "updatedAt",
          "status",
          "reviewer",
        ])
        .default("updatedAt"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
      queue: z
        .enum(["all", "my", "given", "support", "review"])
        .optional()
        .transform((s) => (s && s !== "all" ? s : undefined)),
    })
    .parse(req.query);

  const result = await taskService.listTasksPaginated(
    req.userId!,
    req.tenantId!,
    {
      page: q.page,
      pageSize: q.pageSize,
      queue: q.queue,
      statusId: q.statusId,
      priority: q.priority,
      dueFrom: q.dueFrom,
      dueTo: q.dueTo,
      search: q.search,
      sortBy: q.sortBy,
      sortDir: q.sortDir,
    },
  );
  res.json(result);
});

router.get("/:id", requirePermission("task.update"), async (req, res) => {
  const task = await taskService.getTask(
    req.userId!,
    req.tenantId!,
    String(req.params.id),
  );
  if (!task) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ task });
});

router.post("/", requirePermission("task.create"), async (req, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      statusId: z.string(),
      priority: z.string().optional(),
      taskType: z.string().optional(),
      assignedToId: z.string().optional().nullable(),
      reviewerId: z.string().optional().nullable(),
      supporterId: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      estimatedMinutes: z.number().optional().nullable(),
    })
    .parse(req.body);
  const parseDate = (s: string | null | undefined) =>
    s && String(s).trim() !== "" ? new Date(s) : null;
  const task = await taskService.createTask(req.userId!, req.tenantId!, {
    ...body,
    startDate: parseDate(body.startDate),
    dueDate: parseDate(body.dueDate),
  });
  res.status(201).json({ task });
});

router.delete("/:id", requirePermission("task.update"), async (req, res) => {
  const ok = await taskService.deleteTask(
    req.userId!,
    req.tenantId!,
    String(req.params.id),
  );
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

router.patch("/:id", requirePermission("task.update"), async (req, res) => {
  const body = z
    .object({
      title: z.string().optional(),
      description: z.string().optional().nullable(),
      statusId: z.string().optional(),
      priority: z.string().optional(),
      assignedToId: z.string().optional().nullable(),
      reviewerId: z.string().optional().nullable(),
      supporterId: z.string().optional().nullable(),
      startDate: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      estimatedMinutes: z.number().optional().nullable(),
      taskType: z.string().optional(),
    })
    .parse(req.body);
  const parseOptDate = (s: string | null | undefined) =>
    s === undefined
      ? undefined
      : s && String(s).trim() !== ""
        ? new Date(s)
        : null;
  const task = await taskService.updateTask(
    req.userId!,
    req.tenantId!,
    String(req.params.id),
    {
      ...body,
      startDate:
        body.startDate === undefined
          ? undefined
          : parseOptDate(body.startDate ?? undefined),
      dueDate:
        body.dueDate === undefined
          ? undefined
          : parseOptDate(body.dueDate ?? undefined),
    },
  );
  if (!task) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ task });
});

router.post(
  "/:id/review",
  requirePermission("task.review"),
  async (req, res) => {
    const body = z
      .object({
        decision: z.enum(["approve", "reject"]),
        comment: z.string().optional().nullable(),
      })
      .parse(req.body);
    const task = await taskService.reviewTask(
      req.userId!,
      req.tenantId!,
      String(req.params.id),
      body.decision,
      body.comment,
    );
    if (!task) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ task });
  },
);

router.post(
  "/:id/accept",
  requirePermission("task.update"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const task = await taskService.acceptTask(
      req.userId!,
      req.tenantId!,
      params.id,
    );
    if (!task) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ task });
  },
);

router.post(
  "/:id/start",
  requirePermission("task.update"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const task = await taskService.startTask(
      req.userId!,
      req.tenantId!,
      params.id,
    );
    if (!task) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ task });
  },
);

router.post(
  "/:id/time-log",
  requirePermission("task.update"),
  async (req, res) => {
    const body = z
      .object({ minutes: z.number().int().positive() })
      .parse(req.body);
    const entry = await taskService.addTimeLog(
      req.userId!,
      req.tenantId!,
      String(req.params.id),
      body.minutes,
    );
    if (!entry) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(201).json({ activity: entry });
  },
);

router.post(
  "/:id/comments",
  requirePermission("task.update"),
  async (req, res) => {
    const body = z.object({ message: z.string().min(1) }).parse(req.body);
    const c = await taskService.addComment(
      req.userId!,
      req.tenantId!,
      String(req.params.id),
      body.message,
    );
    if (!c) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(201).json({ comment: c });
  },
);

router.post(
  "/:id/attachments",
  requirePermission("task.update"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "file required" });
      return;
    }
    const finalPath = path.join(uploadDir, req.file.filename);
    fs.renameSync(req.file.path, finalPath);
    const publicUrl = `/uploads/${req.file.filename}`;
    const att = await taskService.addAttachment(
      req.userId!,
      req.tenantId!,
      String(req.params.id),
      publicUrl,
      req.file.originalname,
      req.file.mimetype,
    );
    if (!att) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(201).json({ attachment: att });
  },
);

router.get("/:id/checklist", requirePermission("task.update"), async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).parse(req.params);
  const items = await taskService.listTaskChecklistItems(req.userId!, req.tenantId!, params.id);
  if (!items) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ items });
});

router.post("/:id/checklist/apply-template", requirePermission("task.update"), async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).parse(req.params);
  const body = z.object({ templateId: z.string().min(1) }).parse(req.body);
  const items = await taskService.applyTemplateChecklistToTask(
    req.userId!,
    req.tenantId!,
    params.id,
    body.templateId,
  );
  if (!items) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(201).json({ items });
});

router.patch(
  "/:id/checklist/:itemId",
  requirePermission("task.update"),
  async (req, res) => {
    const params = z
      .object({ id: z.string().min(1), itemId: z.string().min(1) })
      .parse(req.params);
    const body = z
      .object({
        isChecked: z.boolean().optional(),
        remarks: z.string().optional().nullable(),
      })
      .parse(req.body);
    const item = await taskService.updateTaskChecklistItem(
      req.userId!,
      req.tenantId!,
      params.id,
      params.itemId,
      body,
    );
    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ item });
  },
);

router.post(
  "/:id/checklist/:itemId/attachments",
  requirePermission("task.update"),
  upload.single("file"),
  async (req, res) => {
    const params = z
      .object({ id: z.string().min(1), itemId: z.string().min(1) })
      .parse(req.params);
    if (!req.file) {
      res.status(400).json({ error: "file required" });
      return;
    }
    const finalPath = path.join(uploadDir, req.file.filename);
    fs.renameSync(req.file.path, finalPath);
    const publicUrl = `/uploads/${req.file.filename}`;
    const att = await taskService.addAttachment(
      req.userId!,
      req.tenantId!,
      params.id,
      publicUrl,
      req.file.originalname,
      req.file.mimetype,
      params.itemId,
    );
    if (!att) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(201).json({ attachment: att });
  },
);

export default router;
