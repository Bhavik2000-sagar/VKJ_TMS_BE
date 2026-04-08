import { prisma } from "../lib/prisma.js";
const ADMIN_ACTIONS = [
    "task.create",
    "task.assign",
    "task.update",
    "task.review",
    "team.view",
    "meeting.manage",
    "report.view",
    "user.manage",
    "role.manage",
    "org.manage",
    "settings.hierarchy",
    "settings.tenant",
];
const MANAGER_ACTIONS = [
    "task.create",
    "task.assign",
    "task.update",
    "task.review",
    "team.view",
    "meeting.manage",
    "report.view",
];
const STAFF_ACTIONS = ["task.update", "meeting.manage", "report.view"];
export async function bootstrapTenantDefaults(tenantId) {
    const allPerms = await prisma.permission.findMany();
    const byAction = Object.fromEntries(allPerms.map((x) => [x.action, x.id]));
    async function ensureRole(code, name) {
        const existing = await prisma.role.findFirst({ where: { tenantId, code } });
        if (existing)
            return existing;
        return prisma.role.create({
            data: { tenantId, code, name, isSystem: true },
        });
    }
    const adminR = await ensureRole("ADMIN", "Admin");
    const mgrR = await ensureRole("MANAGER", "Manager");
    const staffR = await ensureRole("STAFF", "Staff");
    async function wire(roleId, actions) {
        await prisma.rolePermission.deleteMany({ where: { roleId } });
        for (const a of actions) {
            await prisma.rolePermission.create({
                data: { roleId, permissionId: byAction[a] },
            });
        }
    }
    await wire(adminR.id, ADMIN_ACTIONS);
    await wire(mgrR.id, MANAGER_ACTIONS);
    await wire(staffR.id, STAFF_ACTIONS);
    const statuses = [
        { code: "DRAFT", label: "Draft", isTerminal: false },
        { code: "TODO", label: "To Do", isTerminal: false },
        { code: "WIP", label: "In Progress", isTerminal: false },
        { code: "WAIT_SUPPORT", label: "Waiting Support", isTerminal: false },
        { code: "REVIEW", label: "Review", isTerminal: false },
        { code: "SENT_BACK", label: "Sent Back", isTerminal: false },
        { code: "DONE", label: "Done", isTerminal: true },
        { code: "CLOSED", label: "Closed", isTerminal: true },
        { code: "ESCALATED", label: "Escalated", isTerminal: false },
        { code: "BLOCKED", label: "Blocked", isTerminal: false },
    ];
    for (let i = 0; i < statuses.length; i++) {
        await prisma.taskStatus.upsert({
            where: { tenantId_code: { tenantId, code: statuses[i].code } },
            create: {
                tenantId,
                code: statuses[i].code,
                label: statuses[i].label,
                sortOrder: i,
                isTerminal: statuses[i].isTerminal,
            },
            update: {
                label: statuses[i].label,
                sortOrder: i,
                isTerminal: statuses[i].isTerminal,
            },
        });
    }
    return {
        adminRoleId: adminR.id,
        managerRoleId: mgrR.id,
        staffRoleId: staffR.id,
    };
}
//# sourceMappingURL=tenantBootstrap.service.js.map