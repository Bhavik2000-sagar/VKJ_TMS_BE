import { prisma } from "../lib/prisma.js";
import * as taskService from "./task.service.js";

export async function dashboardStats(
  userId: string,
  tenantId: string,
  departmentScopeIds?: string[] | null,
) {
  const tasks = await taskService.listTasks(
    userId,
    tenantId,
    departmentScopeIds ?? undefined,
  );
  const byStatus = tasks.reduce(
    (acc, t) => {
      const k = t.status.code;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate < new Date() && t.status.code !== "DONE",
  ).length;
  return {
    totalTasks: tasks.length,
    byStatus,
    overdue,
  };
}

export async function taskSummaryByUser(
  tenantId: string,
  departmentScopeIds?: string[] | null,
) {
  const rows = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: {
      tenantId,
      assignedToId: { not: null },
      ...(departmentScopeIds?.length
        ? { departmentId: { in: departmentScopeIds } }
        : {}),
    },
    _count: { id: true },
  });
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      id: { in: rows.map((r) => r.assignedToId!).filter(Boolean) },
    },
    select: { id: true, name: true, username: true },
  });
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    user: byId[r.assignedToId!],
    count: r._count.id,
  }));
}
