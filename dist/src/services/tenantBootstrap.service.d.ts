/** Stable codes for tenant hierarchy roles (Add user form). */
export declare const TENANT_ASSIGNABLE_ROLE_CODES: readonly string[];
/**
 * Ensures the five hierarchy roles exist with correct display names.
 * Wires default permissions only for **new** roles or roles that have no permissions yet
 * (so existing customized Admin/Manager/Staff roles are not reset).
 */
export declare function ensureTenantHierarchyRoles(tenantId: string): Promise<{
    adminRoleId: string;
    managerRoleId: string;
    staffRoleId: string;
}>;
export declare function bootstrapTenantDefaults(tenantId: string): Promise<{
    adminRoleId: string;
    managerRoleId: string;
    staffRoleId: string;
}>;
