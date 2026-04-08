export declare function dashboardStats(userId: string, tenantId: string): Promise<{
    totalTasks: number;
    byStatus: Record<string, number>;
    overdue: number;
}>;
export declare function taskSummaryByUser(tenantId: string): Promise<{
    user: {
        name: string;
        id: string;
        email: string;
    };
    count: number;
}[]>;
