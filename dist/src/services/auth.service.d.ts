export declare function getAccessCookieName(): string;
export declare function getRefreshCookieName(): string;
export declare function buildAuthCookieOptions(maxAgeMs?: number): {
    maxAge?: number | undefined;
    domain?: string | undefined;
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: string;
};
export declare function loginUser(email: string, password: string): Promise<{
    user: {
        tenant: {
            status: import("@prisma/client").$Enums.TenantStatus;
            name: string;
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
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
    };
    accessToken: string;
    refreshToken: string;
    rawRefresh: string;
}>;
export declare function refreshSession(refreshJwt: string): Promise<{
    user: {
        tenant: {
            status: import("@prisma/client").$Enums.TenantStatus;
            name: string;
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
        } | null;
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
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function revokeRefreshByHash(jti: string | undefined): Promise<void>;
export declare function requestPasswordReset(email: string): Promise<void>;
export declare function completePasswordReset(rawToken: string, newPassword: string): Promise<void>;
