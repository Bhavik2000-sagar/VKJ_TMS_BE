import { prisma } from "../lib/prisma.js";
import * as notificationService from "./notification.service.js";

function computedMeetingStatus(input: {
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  datetime: Date;
  durationMinutes: number | null;
}) {
  if (input.status === "CANCELLED") return "CANCELLED" as const;
  if (input.status === "COMPLETED") return "COMPLETED" as const;
  const start = input.datetime.getTime();
  const now = Date.now();
  if (now >= start) return "IN_PROGRESS" as const;
  return "SCHEDULED" as const;
}

export async function listMeetings(userId: string, tenantId: string) {
  return prisma.meeting.findMany({
    where: {
      tenantId,
      OR: [{ createdById: userId }, { attendees: { some: { userId } } }],
    },
    include: {
      createdBy: { select: { id: true, name: true, username: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      outcomes: { include: { task: { select: { id: true, title: true } } } },
    },
    orderBy: { datetime: "desc" },
  });
}

export async function listMeetingsPaginated(input: {
  userId: string;
  tenantId: string;
  page: number;
  pageSize: number;
  search?: string;
  priority?: string;
  status?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  sortBy: "datetime" | "title" | "createdAt";
  sortDir: "asc" | "desc";
}) {
  const term = input.search?.trim();
  const where = {
    tenantId: input.tenantId,
    OR: [
      { createdById: input.userId },
      { attendees: { some: { userId: input.userId } } },
    ],
    ...(input.priority ? { priority: input.priority } : {}),
    ...(term
      ? {
          OR: [{ title: { contains: term } }, { agenda: { contains: term } }],
        }
      : {}),
  };

  // If status filter is applied (computed), filter in-memory so totals remain correct.
  const mustFilterComputedStatus = Boolean(input.status);
  const baseOrderBy = { [input.sortBy]: input.sortDir } as const;

  if (mustFilterComputedStatus) {
    const all = await prisma.meeting.findMany({
      where,
      orderBy: baseOrderBy,
      select: {
        id: true,
        title: true,
        agenda: true,
        meetingLink: true,
        priority: true,
        durationMinutes: true,
        status: true,
        datetime: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, username: true } },
        attendees: { select: { userId: true } },
      },
    });
    const withComputed = all.map((m) => ({
      ...m,
      computedStatus: computedMeetingStatus({
        status: m.status,
        datetime: m.datetime,
        durationMinutes: m.durationMinutes,
      }),
    }));
    const filtered = withComputed.filter(
      (m) => m.computedStatus === input.status,
    );
    const total = filtered.length;
    const start = (input.page - 1) * input.pageSize;
    const end = start + input.pageSize;
    return { total, items: filtered.slice(start, end) };
  }

  const [total, items] = await Promise.all([
    prisma.meeting.count({ where }),
    prisma.meeting.findMany({
      where,
      orderBy: baseOrderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        title: true,
        agenda: true,
        meetingLink: true,
        priority: true,
        durationMinutes: true,
        status: true,
        datetime: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true, username: true } },
        attendees: { select: { userId: true } },
      },
    }),
  ]);

  return {
    total,
    items: items.map((m) => ({
      ...m,
      computedStatus: computedMeetingStatus({
        status: m.status,
        datetime: m.datetime,
        durationMinutes: m.durationMinutes,
      }),
    })),
  };
}

export async function getMeeting(
  userId: string,
  tenantId: string,
  meetingId: string,
) {
  const m = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    include: {
      createdBy: { select: { id: true, name: true, username: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      outcomes: { include: { task: { select: { id: true, title: true } } } },
    },
  });
  if (!m) return null;
  const allowed =
    m.createdById === userId || m.attendees.some((a) => a.userId === userId);
  if (!allowed) return null;
  return {
    ...m,
    computedStatus: computedMeetingStatus({
      status: m.status,
      datetime: m.datetime,
      durationMinutes: m.durationMinutes,
    }),
  };
}

export async function createMeeting(
  userId: string,
  tenantId: string,
  data: {
    title: string;
    agenda?: string | null;
    meetingLink?: string | null;
    preparationNotes?: string | null;
    priority?: string | null;
    durationMinutes?: number | null;
    datetime: Date;
    attendeeIds: string[];
  },
) {
  const meeting = await prisma.meeting.create({
    data: {
      tenantId,
      title: data.title,
      agenda: data.agenda,
      meetingLink: data.meetingLink ?? null,
      preparationNotes: data.preparationNotes ?? null,
      priority: data.priority ?? "MEDIUM",
      durationMinutes: data.durationMinutes ?? 30,
      status: "SCHEDULED",
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

export async function updateMeeting(
  userId: string,
  tenantId: string,
  meetingId: string,
  data: Partial<{
    title: string;
    agenda: string | null;
    meetingLink: string | null;
    preparationNotes: string | null;
    priority: string;
    durationMinutes: number | null;
    datetime: Date;
    attendeeIds: string[];
  }>,
) {
  const existing = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    include: { attendees: true },
  });
  if (!existing) return null;

  const allowed =
    existing.createdById === userId ||
    existing.attendees.some((a) => a.userId === userId);
  if (!allowed) return null;

  const attendeeIdsNext = data.attendeeIds
    ? Array.from(new Set(data.attendeeIds))
    : null;

  const meeting = await prisma.$transaction(async (tx) => {
    if (attendeeIdsNext) {
      const current = new Set(existing.attendees.map((a) => a.userId));
      const next = new Set(attendeeIdsNext);
      const toAdd = attendeeIdsNext.filter((id) => !current.has(id));
      const toRemove = Array.from(current).filter((id) => !next.has(id));

      if (toRemove.length) {
        await tx.meetingAttendee.deleteMany({
          where: { meetingId, userId: { in: toRemove } },
        });
      }
      if (toAdd.length) {
        await tx.meetingAttendee.createMany({
          data: toAdd.map((uid) => ({ meetingId, userId: uid })),
          skipDuplicates: true,
        });
      }
    }

    return tx.meeting.update({
      where: { id: meetingId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.agenda !== undefined ? { agenda: data.agenda } : {}),
        ...(data.meetingLink !== undefined
          ? { meetingLink: data.meetingLink }
          : {}),
        ...(data.preparationNotes !== undefined
          ? { preparationNotes: data.preparationNotes }
          : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.durationMinutes !== undefined
          ? { durationMinutes: data.durationMinutes }
          : {}),
        ...(data.datetime !== undefined ? { datetime: data.datetime } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        attendees: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
        outcomes: { include: { task: { select: { id: true, title: true } } } },
      },
    });
  });

  if (attendeeIdsNext) {
    for (const uid of attendeeIdsNext) {
      if (uid !== userId) {
        await notificationService.createNotification({
          userId: uid,
          type: "MEETING_INVITE",
          message: `Meeting updated: ${meeting.title}`,
        });
      }
    }
  }

  return meeting;
}

export async function deleteMeeting(
  userId: string,
  tenantId: string,
  meetingId: string,
) {
  const existing = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    select: { id: true, createdById: true },
  });
  if (!existing) return false;
  if (existing.createdById !== userId) return false;
  await prisma.meeting.delete({ where: { id: meetingId } });
  return true;
}

export async function cancelMeeting(
  userId: string,
  tenantId: string,
  meetingId: string,
) {
  const existing = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    select: { id: true, createdById: true, status: true },
  });
  if (!existing) return null;
  if (existing.createdById !== userId) return null;
  if (existing.status === "CANCELLED") return existing;
  return prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "CANCELLED" },
  });
}

export async function completeMeeting(
  userId: string,
  tenantId: string,
  meetingId: string,
) {
  const existing = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    select: { id: true, createdById: true, status: true },
  });
  if (!existing) return null;
  if (existing.createdById !== userId) return null;
  if (existing.status === "CANCELLED") return null;
  if (existing.status === "COMPLETED") return existing;
  return prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "COMPLETED" },
  });
}

export async function addOutcome(
  userId: string,
  tenantId: string,
  meetingId: string,
  outcomeText: string,
  assigneeId?: string | null,
) {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
  });
  if (!meeting) return null;

  const canCreateTasks =
    computedMeetingStatus({
      status: meeting.status,
      datetime: meeting.datetime,
      durationMinutes: meeting.durationMinutes,
    }) === "COMPLETED";
  if (!canCreateTasks) {
    throw new Error("Meeting is not completed yet");
  }

  const todo = await prisma.taskStatus.findFirst({
    where: { tenantId, code: "TODO" },
  });
  if (!todo) throw new Error("TODO status missing for tenant");

  const assignTo = assigneeId ?? meeting.createdById;
  const task = await prisma.task.create({
    data: {
      tenantId,
      title: `From meeting: ${meeting.title}`,
      description: outcomeText,
      statusId: todo.id,
      priority: "MEDIUM",
      createdFrom: "MEETING",
      meetingId: meetingId,
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
