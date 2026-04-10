import { prisma } from "../lib/prisma.js";
import { keysToRolePermissionRows, P } from "../constants/permissions.js";

/**
 * Stable code for the one bootstrapped full-access tenant role.
 * Display name is stored on `Role.name` and is editable (e.g. "Director", "Owner").
 */
export const TENANT_PRIMARY_ADMIN_ROLE_CODE = "COMPANY_ADMIN";

/** Full access for the tenant primary admin role only. */
const PRIMARY_ADMIN_KEYS = [
  P.TASKS_READ,
  P.TASKS_CREATE,
  P.TASKS_UPDATE,
  P.TASKS_DELETE,
  P.TASKS_ASSIGN,
  P.TASKS_REVIEW,

  P.USERS_READ,
  P.USERS_CREATE,
  P.USERS_UPDATE,
  P.USERS_DELETE,

  P.MEETINGS_READ,
  P.MEETINGS_CREATE,
  P.MEETINGS_UPDATE,
  P.MEETINGS_DELETE,

  P.REPORTS_READ,
  P.REPORTS_CREATE,
  P.REPORTS_UPDATE,
  P.REPORTS_DELETE,

  P.ROLES_READ,
  P.ROLES_CREATE,
  P.ROLES_UPDATE,
  P.ROLES_DELETE,

  P.DEPARTMENTS_READ,
  P.DEPARTMENTS_CREATE,
  P.DEPARTMENTS_UPDATE,
  P.DEPARTMENTS_DELETE,

  P.SETTINGS_READ,
  P.SETTINGS_CREATE,
  P.SETTINGS_UPDATE,
  P.SETTINGS_DELETE,
] as const;

async function wireRolePermissions(roleId: string, keys: readonly string[]) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  const rows = keysToRolePermissionRows([...keys]);
  if (rows.length) {
    await prisma.rolePermission.createMany({
      data: rows.map((r) => ({
        roleId,
        module: r.module,
        action: r.action,
      })),
    });
  }
}

/** The tenant's bootstrapped company-admin role, if present (handles legacy `ADMIN` code). */
export async function getTenantPrimaryAdminRole(tenantId: string) {
  return prisma.role.findFirst({
    where: {
      tenantId,
      OR: [{ code: TENANT_PRIMARY_ADMIN_ROLE_CODE }, { code: "ADMIN" }],
    },
  });
}

export function isTenantPrimaryAdminRoleRow(
  row: { code: string } | null | undefined,
) {
  if (!row) return false;
  return row.code === TENANT_PRIMARY_ADMIN_ROLE_CODE || row.code === "ADMIN";
}

/**
 * Ensures the tenant has exactly one primary admin role with full company permissions.
 * Migrates legacy `ADMIN` row to `COMPANY_ADMIN` when found.
 */
export async function ensureTenantPrimaryAdminRole(tenantId: string) {
  let primary =
    (await prisma.role.findFirst({
      where: { tenantId, code: TENANT_PRIMARY_ADMIN_ROLE_CODE },
    })) ??
    (await prisma.role.findFirst({
      where: { tenantId, code: "ADMIN" },
    }));

  if (primary && primary.code !== TENANT_PRIMARY_ADMIN_ROLE_CODE) {
    primary = await prisma.role.update({
      where: { id: primary.id },
      data: { code: TENANT_PRIMARY_ADMIN_ROLE_CODE },
    });
  }

  if (!primary) {
    primary = await prisma.role.create({
      data: {
        tenantId,
        code: TENANT_PRIMARY_ADMIN_ROLE_CODE,
        name: "Company admin",
        isSystem: true,
      },
    });
  }

  const permCount = await prisma.rolePermission.count({
    where: { roleId: primary.id },
  });
  if (permCount === 0) {
    await wireRolePermissions(primary.id, PRIMARY_ADMIN_KEYS);
  }

  return { primaryAdminRoleId: primary.id };
}

export async function bootstrapTenantDefaults(tenantId: string) {
  const synced = await ensureTenantPrimaryAdminRole(tenantId);

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

  return { primaryAdminRoleId: synced.primaryAdminRoleId };
}

export async function assertActorMayAssignRole(input: {
  tenantId: string;
  actorRoleId: string;
  targetRoleId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const primary = await getTenantPrimaryAdminRole(input.tenantId);
  if (!primary) {
    return { ok: false, status: 500, error: "Tenant roles not provisioned" };
  }
  if (input.targetRoleId === primary.id && input.actorRoleId !== primary.id) {
    return {
      ok: false,
      status: 403,
      error: "Only a company admin may assign the company admin role",
    };
  }
  return { ok: true };
}
