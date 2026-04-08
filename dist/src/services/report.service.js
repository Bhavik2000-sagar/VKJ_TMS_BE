import { prisma } from "../lib/prisma.js";
import * as taskService from "./task.service.js";
export async function dashboardStats(userId, tenantId) {
    const tasks = await taskService.listTasks(userId, tenantId);
    const byStatus = tasks.reduce((acc, t) => {
        const k = t.status.code;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
    }, {});
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status.code !== "DONE").length;
    return {
        totalTasks: tasks.length,
        byStatus,
        overdue,
    };
}
export async function taskSummaryByUser(tenantId) {
    const rows = await prisma.task.groupBy({
        by: ["assignedToId"],
        where: { tenantId, assignedToId: { not: null } },
        _count: { id: true },
    });
    const users = await prisma.user.findMany({
        where: { tenantId, id: { in: rows.map((r) => r.assignedToId).filter(Boolean) } },
        select: { id: true, name: true, email: true },
    });
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
        user: byId[r.assignedToId],
        count: r._count.id,
    }));
}
//# sourceMappingURL=report.service.js.map