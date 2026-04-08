export declare function listMeetings(userId: string, tenantId: string): Promise<({
    createdBy: {
        name: string;
        id: string;
        email: string;
    };
    outcomes: ({
        task: {
            id: string;
            title: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        taskId: string | null;
        outcomeText: string;
        meetingId: string;
    })[];
    attendees: ({
        user: {
            name: string;
            id: string;
            email: string;
        };
    } & {
        userId: string;
        meetingId: string;
    })[];
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    createdById: string;
    agenda: string | null;
    datetime: Date;
})[]>;
export declare function getMeeting(userId: string, tenantId: string, meetingId: string): Promise<({
    createdBy: {
        name: string;
        id: string;
        email: string;
    };
    outcomes: ({
        task: {
            id: string;
            title: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        taskId: string | null;
        outcomeText: string;
        meetingId: string;
    })[];
    attendees: ({
        user: {
            name: string;
            id: string;
            email: string;
        };
    } & {
        userId: string;
        meetingId: string;
    })[];
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    createdById: string;
    agenda: string | null;
    datetime: Date;
}) | null>;
export declare function createMeeting(userId: string, tenantId: string, data: {
    title: string;
    agenda?: string | null;
    datetime: Date;
    attendeeIds: string[];
}): Promise<{
    attendees: {
        userId: string;
        meetingId: string;
    }[];
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    createdById: string;
    agenda: string | null;
    datetime: Date;
}>;
export declare function addOutcome(userId: string, tenantId: string, meetingId: string, outcomeText: string, assigneeId?: string | null): Promise<{
    outcome: {
        id: string;
        createdAt: Date;
        taskId: string | null;
        outcomeText: string;
        meetingId: string;
    };
    task: {
        priority: string;
        id: string;
        tenantId: string;
        branchId: string | null;
        departmentId: string | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        statusId: string;
        assignedToId: string | null;
        reviewerId: string | null;
        supporterId: string | null;
        createdById: string;
        startDate: Date | null;
        dueDate: Date | null;
        estimatedMinutes: number | null;
        acceptedAt: Date | null;
        startedAt: Date | null;
        submittedAt: Date | null;
        reviewedAt: Date | null;
        closedAt: Date | null;
        taskType: string;
    };
} | null>;
