import type { Prisma } from "@prisma/client";
declare function canViewTask(userId: string, tenantId: string | null, task: {
    id: string;
}): Promise<boolean>;
export type TaskListSortField = "title" | "priority" | "dueDate" | "updatedAt" | "status" | "reviewer";
export declare function listTasks(userId: string, tenantId: string): Promise<({
    status: {
        code: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        label: string;
        sortOrder: number;
        isTerminal: boolean;
    };
    assignedTo: {
        name: string;
        id: string;
        email: string;
    } | null;
    reviewer: {
        name: string;
        id: string;
        email: string;
    } | null;
    createdBy: {
        name: string;
        id: string;
        email: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
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
})[]>;
export type TaskListQueue = "all" | "my" | "given" | "support" | "review";
export declare function listTasksPaginated(userId: string, tenantId: string, params: {
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
}): Promise<{
    tasks: ({
        status: {
            code: string;
            id: string;
            createdAt: Date;
            tenantId: string;
            label: string;
            sortOrder: number;
            isTerminal: boolean;
        };
        assignedTo: {
            name: string;
            id: string;
            email: string;
        } | null;
        reviewer: {
            name: string;
            id: string;
            email: string;
        } | null;
        createdBy: {
            name: string;
            id: string;
            email: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        branchId: string | null;
        departmentId: string | null;
        title: string;
        description: string | null;
        statusId: string;
        priority: string;
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
    })[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function getTask(userId: string, tenantId: string, taskId: string): Promise<({
    status: {
        code: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        label: string;
        sortOrder: number;
        isTerminal: boolean;
    };
    attachments: {
        id: string;
        createdAt: Date;
        taskId: string;
        checklistItemId: string | null;
        fileUrl: string;
        fileName: string | null;
        mimeType: string | null;
    }[];
    activities: ({
        user: {
            name: string;
            id: string;
            email: string;
        };
    } & {
        message: string | null;
        type: import("@prisma/client").$Enums.TaskActivityType;
        id: string;
        createdAt: Date;
        userId: string;
        taskId: string;
        metadata: Prisma.JsonValue | null;
    })[];
    assignedTo: {
        name: string;
        id: string;
        email: string;
    } | null;
    reviewer: {
        name: string;
        id: string;
        email: string;
    } | null;
    supporter: {
        name: string;
        id: string;
        email: string;
    } | null;
    createdBy: {
        name: string;
        id: string;
        email: string;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
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
}) | null>;
export declare function createTask(userId: string, tenantId: string, data: {
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
}): Promise<{
    status: {
        code: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        label: string;
        sortOrder: number;
        isTerminal: boolean;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
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
}>;
export declare function updateTask(userId: string, tenantId: string, taskId: string, data: Partial<{
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
}>): Promise<({
    status: {
        code: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        label: string;
        sortOrder: number;
        isTerminal: boolean;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
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
}) | null>;
export declare function reviewTask(userId: string, tenantId: string, taskId: string, decision: "approve" | "reject", comment?: string | null): Promise<({
    status: {
        code: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        label: string;
        sortOrder: number;
        isTerminal: boolean;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
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
}) | null>;
export declare function acceptTask(userId: string, tenantId: string, taskId: string): Promise<({
    status: {
        code: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        label: string;
        sortOrder: number;
        isTerminal: boolean;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
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
}) | null>;
export declare function startTask(userId: string, tenantId: string, taskId: string): Promise<({
    status: {
        code: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        label: string;
        sortOrder: number;
        isTerminal: boolean;
    };
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    branchId: string | null;
    departmentId: string | null;
    title: string;
    description: string | null;
    statusId: string;
    priority: string;
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
}) | null>;
export declare function addTimeLog(userId: string, tenantId: string, taskId: string, minutes: number): Promise<{
    message: string | null;
    type: import("@prisma/client").$Enums.TaskActivityType;
    id: string;
    createdAt: Date;
    userId: string;
    taskId: string;
    metadata: Prisma.JsonValue | null;
} | null>;
export declare function addComment(userId: string, tenantId: string, taskId: string, message: string): Promise<{
    message: string | null;
    type: import("@prisma/client").$Enums.TaskActivityType;
    id: string;
    createdAt: Date;
    userId: string;
    taskId: string;
    metadata: Prisma.JsonValue | null;
} | null>;
export declare function addAttachment(userId: string, tenantId: string, taskId: string, fileUrl: string, fileName?: string, mimeType?: string, checklistItemId?: string | null): Promise<{
    id: string;
    createdAt: Date;
    taskId: string;
    checklistItemId: string | null;
    fileUrl: string;
    fileName: string | null;
    mimeType: string | null;
} | null>;
export declare function applyTemplateChecklistToTask(userId: string, tenantId: string, taskId: string, templateId: string): Promise<{
    id: string;
    sortOrder: number;
    text: string;
    mandatory: boolean;
    isChecked: boolean;
    checkedAt: Date | null;
    checkedById: string | null;
    remarks: string | null;
}[] | null>;
export declare function listTaskChecklistItems(userId: string, tenantId: string, taskId: string): Promise<{
    id: string;
    sortOrder: number;
    text: string;
    attachments: {
        id: string;
        createdAt: Date;
        fileUrl: string;
        fileName: string | null;
        mimeType: string | null;
    }[];
    mandatory: boolean;
    isChecked: boolean;
    checkedAt: Date | null;
    checkedById: string | null;
    remarks: string | null;
    checkedBy: {
        name: string;
        id: string;
        email: string;
    } | null;
}[] | null>;
export declare function updateTaskChecklistItem(userId: string, tenantId: string, taskId: string, itemId: string, data: {
    isChecked?: boolean;
    remarks?: string | null;
}): Promise<{
    id: string;
    sortOrder: number;
    text: string;
    mandatory: boolean;
    isChecked: boolean;
    checkedAt: Date | null;
    checkedById: string | null;
    remarks: string | null;
} | null>;
export declare function deleteTask(userId: string, tenantId: string, taskId: string): Promise<boolean>;
export { canViewTask };
