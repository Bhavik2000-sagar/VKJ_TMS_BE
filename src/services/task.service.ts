import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { getEffectivePermissionActions } from "./permission.service.js";
import { getSubordinateIds } from "./hierarchy.service.js";
import * as notificationService from "./notification.service.js";
import { emitToUser } from "../socketHub.js";

async function canViewTask(
  userId: string,
  tenantId: string | null,
  task: { id: string },
) {
  const full = await prisma.task.findFirst({
    where: { id: task.id, tenantId: tenantId ?? undefined },
    select: {
      assignedToId: true,
      reviewerId: true,
      supporterId: true,
      createdById: true,
    },
  });
  if (!full) return false;
  if (
    full.assignedToId === userId ||
    full.reviewerId === userId ||
    full.supporterId === userId ||
    full.createdById === userId
  ) {
    return true;
  }
  const perms = await getEffectivePermissionActions(userId);
  if (!perms.has("team.view")) return false;
  const subs = await getSubordinateIds(userId);
  const scope = new Set([userId, ...subs]);
  if (full.assignedToId && scope.has(full.assignedToId)) return true;
  if (full.createdById && scope.has(full.createdById)) return true;
  return false;
}

async function taskVisibilityOrClause(
  userId: string,
  tenantId: string,
): Promise<Prisma.TaskWhereInput[]> {
  const perms = await getEffectivePermissionActions(userId);
  const subs = await getSubordinateIds(userId);
  const scopeIds = new Set([userId, ...subs]);

  const or: Prisma.TaskWhereInput[] = [
    { assignedToId: userId },
    { reviewerId: userId },
    { supporterId: userId },
    { createdById: userId },
  ];
  if (perms.has("team.view")) {
    or.push({ assignedToId: { in: Array.from(scopeIds) } });
    or.push({ createdById: { in: Array.from(scopeIds) } });
  }
  return or;
}

export type TaskListSortField =
  | "title"
  | "priority"
  | "dueDate"
  | "updatedAt"
  | "status"
  | "reviewer";

function taskListOrderBy(
  sortBy: TaskListSortField,
  sortDir: "asc" | "desc",
): Prisma.TaskOrderByWithRelationInput {
  const d = sortDir;
  switch (sortBy) {
    case "title":
      return { title: d };
    case "priority":
      return { priority: d };
    case "dueDate":
      return { dueDate: d };
    case "updatedAt":
      return { updatedAt: d };
    case "status":
      return { status: { sortOrder: d } };
    case "reviewer":
      return { reviewer: { name: d } };
    default:
      return { updatedAt: "desc" };
  }
}

export async function listTasks(userId: string, tenantId: string) {
  const or = await taskVisibilityOrClause(userId, tenantId);

  return prisma.task.findMany({
    where: { tenantId, OR: or },
    include: {
      status: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export type TaskListQueue = "all" | "my" | "given" | "support" | "review";

function queueFilter(
  userId: string,
  queue: TaskListQueue | undefined,
): Prisma.TaskWhereInput | null {
  if (!queue || queue === "all") return null;
  switch (queue) {
    case "my":
      return { assignedToId: userId };
    case "given":
      return {
        createdById: userId,
        OR: [{ assignedToId: null }, { assignedToId: { not: userId } }],
      };
    case "support":
      return { supporterId: userId };
    case "review":
      return { reviewerId: userId };
    default:
      return null;
  }
}

export async function listTasksPaginated(
  userId: string,
  tenantId: string,
  params: {
    page: number;
    pageSize: number;
    queue?: TaskListQueue;
    statusId?: string;
    priority?: string;
    dueFrom?: Date;
    dueTo?: Date;
    search?: string;
    sortBy: TaskListSortField;
    sortDir: "asc" | "desc";
  },
) {
  const or = await taskVisibilityOrClause(userId, tenantId);
  const andFilters: Prisma.TaskWhereInput[] = [];

  const qf = queueFilter(userId, params.queue);
  if (qf) andFilters.push(qf);

  if (params.statusId) andFilters.push({ statusId: params.statusId });
  if (params.priority) andFilters.push({ priority: params.priority });
  if (params.dueFrom) andFilters.push({ dueDate: { gte: params.dueFrom } });
  if (params.dueTo) andFilters.push({ dueDate: { lte: params.dueTo } });
  if (params.search?.trim()) {
    const q = params.search.trim();
    andFilters.push({
      OR: [{ title: { contains: q } }, { description: { contains: q } }],
    });
  }

  const where: Prisma.TaskWhereInput = {
    tenantId,
    AND: [{ OR: or }, ...andFilters],
  };

  const orderBy = taskListOrderBy(params.sortBy, params.sortDir);
  const skip = (params.page - 1) * params.pageSize;

  const include = {
    status: true,
    assignedTo: { select: { id: true, name: true, email: true } },
    reviewer: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
  } as const;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include,
      orderBy,
      skip,
      take: params.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks,
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getTask(
  userId: string,
  tenantId: string,
  taskId: string,
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    include: {
      status: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      supporter: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      activities: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
    },
  });
  if (!task) return null;
  const ok = await canViewTask(userId, tenantId, task);
  if (!ok) return null;
  return task;
}

export async function createTask(
  userId: string,
  tenantId: string,
  data: {
    title: string;
    description?: string | null;
    statusId: string;
    priority?: string;
    taskType?: string;
    assignedToId?: string | null;
    reviewerId?: string | null;
    supporterId?: string | null;
    startDate?: Date | null;
    dueDate?: Date | null;
    estimatedMinutes?: number | null;
  },
) {
  const task = await prisma.task.create({
    data: {
      tenantId,
      title: data.title,
      description: data.description,
      statusId: data.statusId,
      priority: data.priority ?? "MEDIUM",
      taskType: data.taskType ?? "GENERAL",
      assignedToId: data.assignedToId,
      reviewerId: data.reviewerId,
      supporterId: data.supporterId,
      createdById: userId,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedMinutes: data.estimatedMinutes,
    },
    include: { status: true },
  });
  await prisma.taskActivity.create({
    data: {
      taskId: task.id,
      userId,
      type: "STATUS_CHANGE",
      message: "Task created",
    },
  });
  if (data.assignedToId && data.assignedToId !== userId) {
    await notificationService.createNotification({
      userId: data.assignedToId,
      type: "TASK_ASSIGNED",
      message: `You were assigned: ${task.title}`,
      taskId: task.id,
    });
    emitToUser(data.assignedToId, "TASK_ASSIGNED", { taskId: task.id });
  }
  return task;
}

export async function updateTask(
  userId: string,
  tenantId: string,
  taskId: string,
  data: Partial<{
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
    taskType: string;
    assignedToId: string | null;
    reviewerId: string | null;
    supporterId: string | null;
    startDate: Date | null;
    dueDate: Date | null;
    estimatedMinutes: number | null;
  }>,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return null;
  const ok = await canViewTask(userId, tenantId, existing);
  if (!ok) return null;

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: { status: true },
  });
  await prisma.taskActivity.create({
    data: {
      taskId,
      userId,
      type: "STATUS_CHANGE",
      message: "Task updated",
    },
  });
  const notifyIds = new Set<string>();
  if (existing.assignedToId) notifyIds.add(existing.assignedToId);
  if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
    notifyIds.add(data.assignedToId);
  }
  if (existing.reviewerId) notifyIds.add(existing.reviewerId);
  notifyIds.delete(userId);
  for (const uid of notifyIds) {
    await notificationService.createNotification({
      userId: uid,
      type: "TASK_UPDATED",
      message: `Task updated: ${task.title}`,
      taskId: task.id,
    });
    emitToUser(uid, "TASK_UPDATED", { taskId: task.id });
  }
  return task;
}

export async function reviewTask(
  userId: string,
  tenantId: string,
  taskId: string,
  decision: "approve" | "reject",
  comment?: string | null,
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    include: { status: true },
  });
  if (!task || task.reviewerId !== userId) return null;

  const done = await prisma.taskStatus.findFirst({
    where: { tenantId, code: "DONE" },
  });
  const wip = await prisma.taskStatus.findFirst({
    where: { tenantId, code: "WIP" },
  });

  let nextStatusId = task.statusId;
  if (decision === "approve" && done) nextStatusId = done.id;
  else if (decision === "reject" && wip) nextStatusId = wip.id;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { statusId: nextStatusId },
    include: { status: true },
  });
  const trimmed = comment?.trim() ?? "";
  const baseMsg =
    decision === "approve" ? "Review approved" : "Review rejected — sent back";
  const message =
    trimmed !== ""
      ? `${baseMsg}${decision === "reject" ? ": " : " — "}${trimmed}`
      : baseMsg;
  await prisma.taskActivity.create({
    data: {
      taskId,
      userId,
      type: "STATUS_CHANGE",
      message,
    },
  });
  if (task.assignedToId) {
    await notificationService.createNotification({
      userId: task.assignedToId,
      type: "REVIEW_REQUIRED",
      message:
        decision === "approve"
          ? `Review approved: ${task.title}`
          : `Review rejected: ${task.title}`,
      taskId: task.id,
    });
  }
  return updated;
}

async function resolveStatusIdByCode(tenantId: string, code: string) {
  const s = await prisma.taskStatus.findFirst({ where: { tenantId, code } });
  return s?.id ?? null;
}

export async function acceptTask(
  userId: string,
  tenantId: string,
  taskId: string,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    include: { status: true },
  });
  if (!existing) return null;
  if (existing.assignedToId == null) {
    const err = new Error("Task is not assigned");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  if (existing.assignedToId !== userId) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  const nextStatusId =
    existing.status.code === "TODO"
      ? await resolveStatusIdByCode(tenantId, "WIP")
      : null;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      acceptedAt: existing.acceptedAt ?? new Date(),
      ...(nextStatusId ? { statusId: nextStatusId } : {}),
    },
    include: { status: true },
  });

  await prisma.taskActivity.create({
    data: { taskId, userId, type: "STATUS_CHANGE", message: "Task accepted" },
  });

  const notifyIds = new Set<string>();
  notifyIds.add(existing.createdById);
  if (existing.reviewerId) notifyIds.add(existing.reviewerId);
  notifyIds.delete(userId);
  for (const uid of notifyIds) {
    await notificationService.createNotification({
      userId: uid,
      type: "TASK_UPDATED",
      message: `Task accepted: ${existing.title}`,
      taskId,
    });
    emitToUser(uid, "TASK_UPDATED", { taskId });
  }

  return updated;
}

export async function startTask(
  userId: string,
  tenantId: string,
  taskId: string,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
    include: { status: true },
  });
  if (!existing) return null;
  if (existing.assignedToId == null) {
    const err = new Error("Task is not assigned");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  if (existing.assignedToId !== userId) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  const wipId = await resolveStatusIdByCode(tenantId, "WIP");
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      acceptedAt: existing.acceptedAt ?? new Date(),
      startedAt: existing.startedAt ?? new Date(),
      ...(wipId && existing.status.code !== "WIP" ? { statusId: wipId } : {}),
    },
    include: { status: true },
  });

  await prisma.taskActivity.create({
    data: { taskId, userId, type: "STATUS_CHANGE", message: "Work started" },
  });

  const notifyIds = new Set<string>();
  notifyIds.add(existing.createdById);
  if (existing.reviewerId) notifyIds.add(existing.reviewerId);
  notifyIds.delete(userId);
  for (const uid of notifyIds) {
    await notificationService.createNotification({
      userId: uid,
      type: "TASK_UPDATED",
      message: `Task started: ${existing.title}`,
      taskId,
    });
    emitToUser(uid, "TASK_UPDATED", { taskId });
  }

  return updated;
}

export async function addTimeLog(
  userId: string,
  tenantId: string,
  taskId: string,
  minutes: number,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return null;
  const ok = await canViewTask(userId, tenantId, existing);
  if (!ok) return null;
  return prisma.taskActivity.create({
    data: {
      taskId,
      userId,
      type: "TIME_LOG",
      message: `Logged ${minutes} minute(s)`,
      metadata: { minutes } as Prisma.InputJsonValue,
    },
  });
}

export async function addComment(
  userId: string,
  tenantId: string,
  taskId: string,
  message: string,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return null;
  const ok = await canViewTask(userId, tenantId, existing);
  if (!ok) return null;
  return prisma.taskActivity.create({
    data: {
      taskId,
      userId,
      type: "COMMENT",
      message,
    },
  });
}

export async function addAttachment(
  userId: string,
  tenantId: string,
  taskId: string,
  fileUrl: string,
  fileName?: string,
  mimeType?: string,
  checklistItemId?: string | null,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return null;
  const ok = await canViewTask(userId, tenantId, existing);
  if (!ok) return null;
  return prisma.attachment.create({
    data: {
      taskId,
      fileUrl,
      fileName,
      mimeType,
      checklistItemId: checklistItemId ?? null,
    },
  });
}

export async function applyTemplateChecklistToTask(
  userId: string,
  tenantId: string,
  taskId: string,
  templateId: string,
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
  if (!task) return null;
  const ok = await canViewTask(userId, tenantId, task);
  if (!ok) return null;

  const template = await prisma.template.findFirst({
    where: { id: templateId, tenantId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!template) {
    const err = new Error("Template not found");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  // Replace any existing checklist with the template items.
  await prisma.$transaction(async (tx) => {
    await tx.taskChecklistItem.deleteMany({ where: { taskId } });
    for (let i = 0; i < template.items.length; i++) {
      const it = template.items[i];
      await tx.taskChecklistItem.create({
        data: {
          taskId,
          text: it.text,
          mandatory: it.mandatory,
          sortOrder: i,
        },
      });
    }
    await tx.taskActivity.create({
      data: {
        taskId,
        userId,
        type: "STATUS_CHANGE",
        message: `Checklist applied from template: ${template.name}`,
      },
    });
  });

  return prisma.taskChecklistItem.findMany({
    where: { taskId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      text: true,
      mandatory: true,
      sortOrder: true,
      isChecked: true,
      checkedAt: true,
      checkedById: true,
      remarks: true,
    },
  });
}

export async function listTaskChecklistItems(
  userId: string,
  tenantId: string,
  taskId: string,
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
  if (!task) return null;
  const ok = await canViewTask(userId, tenantId, task);
  if (!ok) return null;

  const items = await prisma.taskChecklistItem.findMany({
    where: { taskId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      text: true,
      mandatory: true,
      sortOrder: true,
      isChecked: true,
      checkedAt: true,
      checkedById: true,
      remarks: true,
      checkedBy: { select: { id: true, name: true, email: true } },
      attachments: {
        select: {
          id: true,
          fileUrl: true,
          fileName: true,
          mimeType: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return items;
}

export async function updateTaskChecklistItem(
  userId: string,
  tenantId: string,
  taskId: string,
  itemId: string,
  data: { isChecked?: boolean; remarks?: string | null },
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
  if (!task) return null;
  const ok = await canViewTask(userId, tenantId, task);
  if (!ok) return null;

  const existing = await prisma.taskChecklistItem.findFirst({
    where: { id: itemId, taskId },
  });
  if (!existing) return null;

  const isCheckedNext = data.isChecked ?? existing.isChecked;
  const checkedAt =
    data.isChecked === undefined
      ? existing.checkedAt
      : isCheckedNext
        ? new Date()
        : null;
  const checkedById =
    data.isChecked === undefined
      ? existing.checkedById
      : isCheckedNext
        ? userId
        : null;

  const updated = await prisma.taskChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      ...(data.isChecked !== undefined
        ? { isChecked: isCheckedNext, checkedAt, checkedById }
        : {}),
    },
    select: {
      id: true,
      text: true,
      mandatory: true,
      sortOrder: true,
      isChecked: true,
      checkedAt: true,
      checkedById: true,
      remarks: true,
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId,
      userId,
      type: "STATUS_CHANGE",
      message:
        data.isChecked !== undefined
          ? "Checklist item updated"
          : "Checklist remarks updated",
    },
  });

  return updated;
}

export async function deleteTask(
  userId: string,
  tenantId: string,
  taskId: string,
): Promise<boolean> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return false;
  const ok = await canViewTask(userId, tenantId, existing);
  if (!ok) return false;

  await prisma.$transaction(async (tx) => {
    await tx.meetingOutcome.updateMany({
      where: { taskId },
      data: { taskId: null },
    });
    await tx.notification.updateMany({
      where: { taskId },
      data: { taskId: null },
    });
    await tx.task.delete({ where: { id: taskId } });
  });
  return true;
}

export { canViewTask };
