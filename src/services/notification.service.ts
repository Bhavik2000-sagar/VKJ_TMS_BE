import type { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emitToUser } from "../socketHub.js";

export async function createNotification(input: {
  userId: string;
  message: string;
  type: NotificationType;
  taskId?: string | null;
  metadata?: object | null;
}) {
  const n = await prisma.notification.create({
    data: {
      userId: input.userId,
      message: input.message,
      type: input.type,
      taskId: input.taskId ?? undefined,
      metadata: input.metadata === undefined ? undefined : (input.metadata as object),
    },
  });
  emitToUser(input.userId, "NOTIFICATION_NEW", { id: n.id });
  return n;
}

export async function listNotifications(userId: string, take = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
