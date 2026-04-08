import { prisma } from "../lib/prisma.js";
export async function getEffectivePermissionActions(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    rolePermissions: { include: { permission: true } },
                },
            },
            userPermissions: { include: { permission: true } },
        },
    });
    if (!user)
        return new Set();
    const set = new Set(user.role.rolePermissions.map((rp) => rp.permission.action));
    for (const up of user.userPermissions) {
        const a = up.permission.action;
        if (up.granted)
            set.add(a);
        else
            set.delete(a);
    }
    return set;
}
export async function assertPermission(userId, action) {
    const perms = await getEffectivePermissionActions(userId);
    if (!perms.has(action)) {
        const err = new Error("Forbidden");
        err.status = 403;
        throw err;
    }
}
//# sourceMappingURL=permission.service.js.map