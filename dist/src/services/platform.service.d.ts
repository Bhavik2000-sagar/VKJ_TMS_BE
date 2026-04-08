export declare function listTenants(): Promise<({
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
})[]>;
export declare function listTenantsPaginated(input: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy: "createdAt" | "name" | "users";
    sortDir: "asc" | "desc";
}): Promise<{
    tenants: ({
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
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function createTenantWithInvitation(input: {
    name: string;
    slug: string;
    adminEmail: string;
}): Promise<{
    tenant: {
        status: import("@prisma/client").$Enums.TenantStatus;
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
    };
    inviteLink: string;
}>;
export declare function acceptTenantInvitation(input: {
    token: string;
    password: string;
    name: string;
}): Promise<{
    role: {
        code: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string | null;
        isSystem: boolean;
    };
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string | null;
    email: string;
    passwordHash: string;
    isActive: boolean;
    roleId: string;
    managerId: string | null;
    branchId: string | null;
    departmentId: string | null;
    employeeCode: string | null;
    phone: string | null;
    birthDate: Date | null;
}>;
export declare function setTenantStatus(input: {
    tenantId: string;
    status: "ACTIVE" | "INVITED" | "INACTIVE";
}): Promise<{
    status: import("@prisma/client").$Enums.TenantStatus;
    name: string;
    id: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function reinviteTenantAdmin(input: {
    tenantId: string;
}): Promise<{
    inviteLink: string;
}>;
export declare function deleteTenant(input: {
    tenantId: string;
}): Promise<{
    ok: true;
}>;
