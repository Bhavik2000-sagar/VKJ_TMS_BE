import { prisma } from "../lib/prisma.js";
import { permissionKey } from "../constants/permissions.js";

export async function getEffectivePermissionActions(userId: string): Promise<Set<string>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: true,
        },
      },
    },
  });
  if (!user) return new Set();

  return new Set(
    user.role.rolePermissions.map((rp) => permissionKey(rp.module, rp.action)),
  );
}

export async function assertPermission(userId: string, action: string): Promise<void> {
  const perms = await getEffectivePermissionActions(userId);
  if (!perms.has(action)) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}
