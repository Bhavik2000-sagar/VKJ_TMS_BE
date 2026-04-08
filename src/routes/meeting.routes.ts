import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import * as meetingService from "../services/meeting.service.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get(
  "/eligible-attendees",
  requirePermission("meeting.manage"),
  async (req, res) => {
    const users = await prisma.user.findMany({
      where: { tenantId: req.tenantId! },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.json({ users });
  },
);

router.get("/", requirePermission("meeting.manage"), async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
      search: z.string().trim().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
      sortBy: z.enum(["datetime", "title", "createdAt"]).optional(),
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
    const meetings = await meetingService.listMeetings(
      req.userId!,
      req.tenantId!,
    );
    res.json({ meetings });
    return;
  }

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const sortBy = query.sortBy ?? "datetime";
  const sortDir = query.sortDir ?? "desc";

  const { items, total } = await meetingService.listMeetingsPaginated({
    userId: req.userId!,
    tenantId: req.tenantId!,
    page,
    pageSize,
    search: query.search,
    priority: query.priority,
    status: query.status,
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
});

router.get("/:id", requirePermission("meeting.manage"), async (req, res) => {
  const m = await meetingService.getMeeting(
    req.userId!,
    req.tenantId!,
    String(req.params.id),
  );
  if (!m) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ meeting: m });
});

router.post("/", requirePermission("meeting.manage"), async (req, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      agenda: z.string().optional().nullable(),
      meetingLink: z.string().url().optional().nullable(),
      preparationNotes: z.string().optional().nullable(),
      priority: z
        .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .optional()
        .nullable(),
      durationMinutes: z.coerce
        .number()
        .int()
        .min(5)
        .max(1440)
        .optional()
        .nullable(),
      datetime: z.string().datetime(),
      attendeeIds: z.array(z.string()).default([]),
    })
    .parse(req.body);
  const meeting = await meetingService.createMeeting(
    req.userId!,
    req.tenantId!,
    {
      ...body,
      datetime: new Date(body.datetime),
    },
  );
  res.status(201).json({ meeting });
});

router.patch("/:id", requirePermission("meeting.manage"), async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).parse(req.params);
  const body = z
    .object({
      title: z.string().min(1).optional(),
      agenda: z.string().optional().nullable(),
      meetingLink: z.string().url().optional().nullable(),
      preparationNotes: z.string().optional().nullable(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      durationMinutes: z.coerce
        .number()
        .int()
        .min(5)
        .max(1440)
        .optional()
        .nullable(),
      datetime: z.string().datetime().optional(),
      attendeeIds: z.array(z.string()).optional(),
    })
    .parse(req.body);

  const { datetime, ...rest } = body;
  const meeting = await meetingService.updateMeeting(
    req.userId!,
    req.tenantId!,
    params.id,
    {
      ...rest,
      ...(datetime ? { datetime: new Date(datetime) } : {}),
    },
  );
  if (!meeting) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ meeting });
});

router.post(
  "/:id/cancel",
  requirePermission("meeting.manage"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const meeting = await meetingService.cancelMeeting(
      req.userId!,
      req.tenantId!,
      params.id,
    );
    if (!meeting) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ meeting });
  },
);

router.post(
  "/:id/complete",
  requirePermission("meeting.manage"),
  async (req, res) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const meeting = await meetingService.completeMeeting(
      req.userId!,
      req.tenantId!,
      params.id,
    );
    if (!meeting) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ meeting });
  },
);

router.post(
  "/:id/outcomes",
  requirePermission("meeting.manage"),
  async (req, res) => {
    const body = z
      .object({
        outcomeText: z.string().min(1),
        assigneeId: z.string().optional().nullable(),
      })
      .parse(req.body);
    try {
      const result = await meetingService.addOutcome(
        req.userId!,
        req.tenantId!,
        String(req.params.id),
        body.outcomeText,
        body.assigneeId,
      );
      if (!result) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  },
);

router.delete("/:id", requirePermission("meeting.manage"), async (req, res) => {
  const params = z.object({ id: z.string().min(1) }).parse(req.params);
  const ok = await meetingService.deleteMeeting(
    req.userId!,
    req.tenantId!,
    params.id,
  );
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

export default router;
