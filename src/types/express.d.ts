import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string | null;
      user?: User & { role?: { code: string } };
      effectivePermissions?: Set<string>;
    }
  }
}

export {};
