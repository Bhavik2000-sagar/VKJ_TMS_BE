import { prisma } from "../lib/prisma.js";
export async function getPlatformDashboard() {
    const [tenantsTotal, usersTotal] = await Promise.all([
        prisma.tenant.count(),
        prisma.user.count({ where: { tenantId: { not: null } } }),
    ]);
    const latestTenants = await prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { users: true } } },
    });
    return {
        tenantsTotal,
        usersTotal,
        latestTenants,
    };
}
//# sourceMappingURL=platformDashboard.service.js.map