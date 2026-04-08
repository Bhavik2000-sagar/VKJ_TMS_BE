export declare function getPlatformDashboard(): Promise<{
    tenantsTotal: number;
    usersTotal: number;
    latestTenants: ({
        _count: {
            users: number;
        };
    } & {
        status: import("@prisma/client").$Enums.TenantStatus;
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
    })[];
}>;
