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
    };
    accessToken: string;
    refreshToken: string;
    rawRefresh: string;
}>;
export declare function refreshSession(refreshJwt: string): Promise<{
    user: {
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
    };
    accessToken: string;
    refreshToken: string;
}>;
export declare function revokeRefreshByHash(jti: string | undefined): Promise<void>;
export declare function requestPasswordReset(email: string): Promise<void>;
export declare function completePasswordReset(rawToken: string, newPassword: string): Promise<void>;
