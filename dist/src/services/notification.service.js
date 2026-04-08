import { prisma } from "../lib/prisma.js";
import { emitToUser } from "../socketHub.js";
export async function createNotification(input) {
    const n = await prisma.notification.create({
        data: {
            userId: input.userId,
            message: input.message,
            type: input.type,
            taskId: input.taskId ?? undefined,
            metadata: input.metadata === undefined ? undefined : input.metadata,
        },
    });
    emitToUser(input.userId, "NOTIFICATION_NEW", { id: n.id });
    return n;
}
export async function listNotifications(userId, take = 50) {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take,
    });
}
export async function unreadCount(userId) {
    return prisma.notification.count({
        where: { userId, isRead: false },
    });
}
export async function markRead(userId, id) {
    return prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
    });
}
export async function markAllRead(userId) {
    return prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
}
//# sourceMappingURL=notification.service.js.map