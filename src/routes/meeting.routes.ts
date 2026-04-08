import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireTenantUser } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import * as meetingService from "../services/meeting.service.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

router.get("/eligible-attendees", requirePermission("meeting.manage"), async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.tenantId! },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json({ users });
});

router.get("/", requirePermission("meeting.manage"), async (req, res) => {
  const meetings = await meetingService.listMeetings(req.userId!, req.tenantId!);
  res.json({ meetings });
});

router.get("/:id", requirePermission("meeting.manage"), async (req, res) => {
  const m = await meetingService.getMeeting(req.userId!, req.tenantId!, String(req.params.id));
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
      datetime: z.string().datetime(),
      attendeeIds: z.array(z.string()).default([]),
    })
    .parse(req.body);
  const meeting = await meetingService.createMeeting(req.userId!, req.tenantId!, {
    ...body,
    datetime: new Date(body.datetime),
  });
  res.status(201).json({ meeting });
});

router.post("/:id/outcomes", requirePermission("meeting.manage"), async (req, res) => {
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
});

export default router;
