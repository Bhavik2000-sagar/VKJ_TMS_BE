import type { NotificationType } from "@prisma/client";
export declare function createNotification(input: {
    userId: string;
    message: string;
    type: NotificationType;
    taskId?: string | null;
    metadata?: object | null;
}): Promise<{
    message: string;
    type: import("@prisma/client").$Enums.NotificationType;
    id: string;
    createdAt: Date;
    userId: string;
    isRead: boolean;
    taskId: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
}>;
export declare function listNotifications(userId: string, take?: number): Promise<{
    message: string;
    type: import("@prisma/client").$Enums.NotificationType;
    id: string;
    createdAt: Date;
    userId: string;
    isRead: boolean;
    taskId: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
}[]>;
export declare function unreadCount(userId: string): Promise<number>;
export declare function markRead(userId: string, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
export declare function markAllRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
