import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
const PERMISSIONS = [
    { action: "platform.tenant.create", module: "platform" },
    { action: "platform.tenant.list", module: "platform" },
    { action: "platform.tenant.manage", module: "platform" },
    { action: "task.create", module: "task" },
    { action: "task.assign", module: "task" },
    { action: "task.update", module: "task" },
    { action: "task.review", module: "task" },
    { action: "team.view", module: "team" },
    { action: "meeting.manage", module: "meeting" },
    { action: "report.view", module: "report" },
    { action: "user.manage", module: "settings" },
    { action: "role.manage", module: "settings" },
    { action: "org.manage", module: "settings" },
    { action: "settings.hierarchy", module: "settings" },
    { action: "settings.tenant", module: "settings" },
];
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
async function main() {
    for (const p of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { action: p.action },
            create: p,
            update: { module: p.module },
        });
    }
    const allPerms = await prisma.permission.findMany();
    const byAction = Object.fromEntries(allPerms.map((x) => [x.action, x.id]));
    let platformRole = await prisma.role.findFirst({
        where: { tenantId: null, code: "SUPER_ADMIN" },
    });
    if (!platformRole) {
        platformRole = await prisma.role.create({
            data: {
                tenantId: null,
                code: "SUPER_ADMIN",
                name: "Super Admin",
                isSystem: true,
            },
        });
    }
    const platformActions = [
        "platform.tenant.create",
        "platform.tenant.list",
        "platform.tenant.manage",
    ];
    await prisma.rolePermission.deleteMany({
        where: { roleId: platformRole.id },
    });
    for (const a of platformActions) {
        await prisma.rolePermission.create({
            data: { roleId: platformRole.id, permissionId: byAction[a] },
        });
    }
    const superPass = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!";
    const superHash = await bcrypt.hash(superPass, 12);
    await prisma.user.upsert({
        where: { email: "superadmin@platform.local" },
        create: {
            email: "superadmin@platform.local",
            passwordHash: superHash,
            name: "Platform Super Admin",
            tenantId: null,
            roleId: platformRole.id,
        },
        update: { passwordHash: superHash, roleId: platformRole.id },
    });
    console.log("Seed: superadmin@platform.local /", superPass);
    const demoTenant = await prisma.tenant.upsert({
        where: { slug: "demo-co" },
        create: { name: "Demo Company", slug: "demo-co" },
        update: {},
    });
    async function ensureRole(tenantId, code, name) {
        const existing = await prisma.role.findFirst({ where: { tenantId, code } });
        if (existing)
            return existing;
        return prisma.role.create({
            data: { tenantId, code, name, isSystem: true },
        });
    }
    const adminR = await ensureRole(demoTenant.id, "ADMIN", "Admin");
    const mgrR = await ensureRole(demoTenant.id, "MANAGER", "Manager");
    const staffR = await ensureRole(demoTenant.id, "STAFF", "Staff");
    async function wirePermissions(roleId, actions) {
        await prisma.rolePermission.deleteMany({ where: { roleId } });
        for (const a of actions) {
            await prisma.rolePermission.create({
                data: { roleId, permissionId: byAction[a] },
            });
        }
    }
    await wirePermissions(adminR.id, ADMIN_ACTIONS);
    await wirePermissions(mgrR.id, MANAGER_ACTIONS);
    await wirePermissions(staffR.id, STAFF_ACTIONS);
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
            where: {
                tenantId_code: { tenantId: demoTenant.id, code: statuses[i].code },
            },
            create: {
                tenantId: demoTenant.id,
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
    const tenantPass = process.env.SEED_TENANT_PASSWORD ?? "Demo123!";
    const th = await bcrypt.hash(tenantPass, 12);
    const adminUser = await prisma.user.upsert({
        where: { email: "admin@demo.co" },
        create: {
            email: "admin@demo.co",
            passwordHash: th,
            name: "Demo Admin",
            tenantId: demoTenant.id,
            roleId: adminR.id,
        },
        update: { passwordHash: th, roleId: adminR.id },
    });
    await prisma.user.upsert({
        where: { email: "manager@demo.co" },
        create: {
            email: "manager@demo.co",
            passwordHash: th,
            name: "Demo Manager",
            tenantId: demoTenant.id,
            roleId: mgrR.id,
            managerId: adminUser.id,
        },
        update: { passwordHash: th, roleId: mgrR.id, managerId: adminUser.id },
    });
    await prisma.user.upsert({
        where: { email: "staff@demo.co" },
        create: {
            email: "staff@demo.co",
            passwordHash: th,
            name: "Demo Staff",
            tenantId: demoTenant.id,
            roleId: staffR.id,
        },
        update: { passwordHash: th, roleId: staffR.id },
    });
    console.log("Seed demo users: admin@demo.co, manager@demo.co, staff@demo.co /", tenantPass);
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map