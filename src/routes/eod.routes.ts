import { Router } from "express";
import {
  authMiddleware,
  requireTenantUser,
} from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(authMiddleware, requireTenantUser);

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function priorityWeight(p?: string | null) {
  const v = String(p ?? "").toUpperCase();
  if (v === "URGENT") return 4;
  if (v === "HIGH") return 3;
  if (v === "MEDIUM") return 2;
  if (v === "LOW") return 1;
  return 0;
}

router.get("/today", async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.userId!;

  const start = startOfTodayUtc();
  const end = endOfTodayUtc();

  const [activityTaskIds, assignedActiveTasks] = await Promise.all([
    prisma.taskActivity.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      select: { taskId: true },
      distinct: ["taskId"],
    }),
    prisma.task.findMany({
      where: { tenantId, assignedToId: userId },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        createdAt: true,
        status: { select: { code: true, label: true, isTerminal: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const workedOnIds = new Set(activityTaskIds.map((x) => x.taskId));

  const completedToday = assignedActiveTasks.filter(
    (t) =>
      t.status.code === "DONE" && t.updatedAt >= start && t.updatedAt <= end,
  );

  const workedOnToday = assignedActiveTasks.filter(
    (t) =>
      (workedOnIds.has(t.id) || (t.updatedAt >= start && t.updatedAt <= end)) &&
      t.status.code !== "DONE",
  );

  const inProgress = assignedActiveTasks.filter(
    (t) => !t.status.isTerminal && t.status.code !== "TODO",
  );

  const overdue = assignedActiveTasks.filter(
    (t) => !t.status.isTerminal && t.dueDate != null && t.dueDate < start,
  );

  const focusNext = assignedActiveTasks
    .filter((t) => !t.status.isTerminal)
    .slice()
    .sort((a, b) => {
      const aOver = a.dueDate != null && a.dueDate < start ? 1 : 0;
      const bOver = b.dueDate != null && b.dueDate < start ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;

      const pw = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (pw !== 0) return pw;

      const aDue = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDue = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;

      return b.updatedAt.getTime() - a.updatedAt.getTime();
    })
    .slice(0, 8);

  res.json({
    meta: {
      rangeUtc: { start: start.toISOString(), end: end.toISOString() },
    },
    completedToday,
    workedOnToday,
    inProgress,
    overdue,
    focusNext,
  });
});

export default router;
