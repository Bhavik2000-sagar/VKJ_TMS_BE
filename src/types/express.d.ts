import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string | null;
      user?: User & {
        role?: { id: string; code: string; departmentId: string | null };
      };
      effectivePermissions?: Set<string>;
      /** Subtree department ids when the user's role is department-scoped; null = company-wide. */
      departmentScopeIds?: string[] | null;
    }
  }
}

export {};
