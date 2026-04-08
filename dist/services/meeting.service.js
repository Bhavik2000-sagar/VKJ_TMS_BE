import { prisma } from "../lib/prisma.js";
import * as notificationService from "./notification.service.js";
export async function listMeetings(userId, tenantId) {
    return prisma.meeting.findMany({
        where: {
            tenantId,
            OR: [
                { createdById: userId },
                { attendees: { some: { userId } } },
            ],
        },
        include: {
            createdBy: { select: { id: true, name: true, email: true } },
            attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
            outcomes: { include: { task: { select: { id: true, title: true } } } },
        },
        orderBy: { datetime: "desc" },
    });
}
export async function getMeeting(userId, tenantId, meetingId) {
    const m = await prisma.meeting.findFirst({
        where: { id: meetingId, tenantId },
        include: {
            createdBy: { select: { id: true, name: true, email: true } },
            attendees: { include: { user: { select: { id: true, name: true, email: true } } } },
            outcomes: { include: { task: { select: { id: true, title: true } } } },
        },
    });
    if (!m)
        return null;
    const allowed = m.createdById === userId || m.attendees.some((a) => a.userId === userId);
    if (!allowed)
        return null;
    return m;
}
export async function createMeeting(userId, tenantId, data) {
    const meeting = await prisma.meeting.create({
        data: {
            tenantId,
            title: data.title,
            agenda: data.agenda,
            datetime: data.datetime,
            createdById: userId,
            attendees: {
                create: data.attendeeIds.map((uid) => ({ userId: uid })),
            },
        },
        include: { attendees: true },
    });
    for (const uid of data.attendeeIds) {
        if (uid !== userId) {
            await notificationService.createNotification({
                userId: uid,
                type: "MEETING_INVITE",
                message: `Meeting: ${data.title}`,
            });
        }
    }
    return meeting;
}
export async function addOutcome(userId, tenantId, meetingId, outcomeText, assigneeId) {
    const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, tenantId } });
    if (!meeting)
        return null;
    const todo = await prisma.taskStatus.findFirst({
        where: { tenantId, code: "TODO" },
    });
    if (!todo)
        throw new Error("TODO status missing for tenant");
    const assignTo = assigneeId ?? meeting.createdById;
    const task = await prisma.task.create({
        data: {
            tenantId,
            title: `From meeting: ${meeting.title}`,
            description: outcomeText,
            statusId: todo.id,
            priority: "MEDIUM",
            assignedToId: assignTo,
            createdById: userId,
        },
    });
    const outcome = await prisma.meetingOutcome.create({
        data: {
            meetingId,
            taskId: task.id,
            outcomeText,
        },
    });
    if (assignTo !== userId) {
        await notificationService.createNotification({
            userId: assignTo,
            type: "TASK_ASSIGNED",
            message: `New task from meeting: ${task.title}`,
            taskId: task.id,
        });
    }
    return { outcome, task };
}
//# sourceMappingURL=meeting.service.js.map