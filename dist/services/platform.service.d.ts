export declare function listTenants(): Promise<({
    _count: {
        users: number;
    };
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
})[]>;
export declare function createTenantWithInvitation(input: {
    name: string;
    slug: string;
    adminEmail: string;
}): Promise<{
    tenant: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
    };
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
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        isSystem: boolean;
    };
} & {
    name: string;
    id: string;
    email: string;
    tenantId: string | null;
    passwordHash: string;
    roleId: string;
    managerId: string | null;
    branchId: string | null;
    departmentId: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
