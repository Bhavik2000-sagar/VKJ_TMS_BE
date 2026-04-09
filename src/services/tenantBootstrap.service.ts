import { prisma } from "../lib/prisma.js";

const MANAGER_ACTIONS = [
  "task.create",
  "task.assign",
  "task.update",
  "task.review",
  "team.view",
  "meeting.view",
  "meeting.manage",
  "report.view",
] as const;

const ADMIN_ACTIONS = [
  ...MANAGER_ACTIONS,
  "user.manage",
  "role.manage",
  "org.manage",
  "settings.hierarchy",
  "settings.tenant",
] as const;

/** Department head: strong ops access without full tenant-wide admin config. */
const VP_GM_ACTIONS = [
  ...MANAGER_ACTIONS,
  "org.manage",
  "user.manage",
  "role.manage",
  "settings.hierarchy",
] as const;

const STAFF_ACTIONS = ["task.create", "task.update", "meeting.view", "report.view"] as const;

const SUPPORTER_ACTIONS = [
  "task.create",
  "task.update",
  "meeting.view",
  "report.view",
] as const;

/** Stable codes for tenant hierarchy roles (Add user form). */
export const TENANT_ASSIGNABLE_ROLE_CODES: readonly string[] = [
  "ADMIN",
  "VP_GM",
  "MANAGER",
  "STAFF",
  "SUPPORTER",
];

/**
 * Which hierarchy roles a user can create, based on their own hierarchy role.
 * Kept separate from permission wiring so we can evolve it without changing permissions.
 */
export const TENANT_CREATABLE_ROLE_CODES_BY_CREATOR: Readonly<
  Record<string, readonly string[]>
> = {
  ADMIN: ["ADMIN", "VP_GM", "MANAGER", "STAFF", "SUPPORTER"],
  VP_GM: ["MANAGER", "STAFF", "SUPPORTER"],
  MANAGER: ["STAFF", "SUPPORTER"],
  STAFF: [],
  SUPPORTER: [],
};

export function creatableTenantRoleCodesForCreator(
  creatorRoleCode: string | null | undefined,
) {
  if (!creatorRoleCode) return [];
  return [...(TENANT_CREATABLE_ROLE_CODES_BY_CREATOR[creatorRoleCode] ?? [])];
}

const ROLE_DEFS: { code: string; name: string; actions: readonly string[] }[] =
  [
    {
      code: "ADMIN",
      name: "Company Admin / Director",
      actions: ADMIN_ACTIONS,
    },
    {
      code: "VP_GM",
      name: "VP / GM (Department Head Level)",
      actions: VP_GM_ACTIONS,
    },
    { code: "MANAGER", name: "Manager", actions: MANAGER_ACTIONS },
    { code: "STAFF", name: "Staff / Doer", actions: STAFF_ACTIONS },
    { code: "SUPPORTER", name: "Supporter", actions: SUPPORTER_ACTIONS },
  ];

async function wireRolePermissions(
  roleId: string,
  actions: readonly string[],
  byAction: Record<string, string>,
) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  for (const a of actions) {
    const pid = byAction[a];
    if (!pid) continue;
    await prisma.rolePermission.create({
      data: { roleId, permissionId: pid },
    });
  }
}

/**
 * Ensures the five hierarchy roles exist with correct display names.
 * Wires default permissions only for **new** roles or roles that have no permissions yet
 * (so existing customized Admin/Manager/Staff roles are not reset).
 */
export async function ensureTenantHierarchyRoles(tenantId: string) {
  const allPerms = await prisma.permission.findMany();
  const byAction = Object.fromEntries(
    allPerms.map((x) => [x.action, x.id]),
  ) as Record<string, string>;

  for (const def of ROLE_DEFS) {
    const existing = await prisma.role.findFirst({
      where: { tenantId, code: def.code },
    });

    if (!existing) {
      const role = await prisma.role.create({
        data: {
          tenantId,
          code: def.code,
          name: def.name,
          isSystem: true,
        },
      });
      await wireRolePermissions(role.id, def.actions, byAction);
      continue;
    }

    if (existing.name !== def.name) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { name: def.name },
      });
    }

    const permCount = await prisma.rolePermission.count({
      where: { roleId: existing.id },
    });
    if (permCount === 0) {
      await wireRolePermissions(existing.id, def.actions, byAction);
    }
  }

  const adminR = await prisma.role.findFirstOrThrow({
    where: { tenantId, code: "ADMIN" },
  });
  const mgrR = await prisma.role.findFirstOrThrow({
    where: { tenantId, code: "MANAGER" },
  });
  const staffR = await prisma.role.findFirstOrThrow({
    where: { tenantId, code: "STAFF" },
  });

  return {
    adminRoleId: adminR.id,
    managerRoleId: mgrR.id,
    staffRoleId: staffR.id,
  };
}

export async function bootstrapTenantDefaults(tenantId: string) {
  const synced = await ensureTenantHierarchyRoles(tenantId);

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
  ] as const;

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
    adminRoleId: synced.adminRoleId,
    managerRoleId: synced.managerRoleId,
    staffRoleId: synced.staffRoleId,
  };
}
