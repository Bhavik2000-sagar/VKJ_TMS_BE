/** Canonical string stored in JWT-backed permission checks: "MODULE.ACTION" (uppercase). */
export function permissionKey(module: string, action: string): string {
  return `${module.trim().toUpperCase()}.${action.trim().toUpperCase()}`;
}

export function parsePermissionKey(key: string): {
  module: string;
  action: string;
} {
  const dot = key.indexOf(".");
  if (dot <= 0) {
    throw new Error(`Invalid permission key: ${key}`);
  }
  return {
    module: key.slice(0, dot).toUpperCase(),
    action: key.slice(dot + 1).toUpperCase(),
  };
}

export const P = {
  PLATFORM_READ: "PLATFORM.READ",
  PLATFORM_CREATE: "PLATFORM.CREATE",
  PLATFORM_UPDATE: "PLATFORM.UPDATE",
  TASKS_ASSIGN: "TASKS.ASSIGN",
  TASKS_REVIEW: "TASKS.REVIEW",
  TASKS_READ: "TASKS.READ",
  TASKS_CREATE: "TASKS.CREATE",
  TASKS_UPDATE: "TASKS.UPDATE",
  TASKS_DELETE: "TASKS.DELETE",

  USERS_READ: "USERS.READ",
  USERS_CREATE: "USERS.CREATE",
  USERS_UPDATE: "USERS.UPDATE",
  USERS_DELETE: "USERS.DELETE",

  ROLES_READ: "ROLES.READ",
  ROLES_CREATE: "ROLES.CREATE",
  ROLES_UPDATE: "ROLES.UPDATE",
  ROLES_DELETE: "ROLES.DELETE",

  DEPARTMENTS_READ: "DEPARTMENTS.READ",
  DEPARTMENTS_CREATE: "DEPARTMENTS.CREATE",
  DEPARTMENTS_UPDATE: "DEPARTMENTS.UPDATE",
  DEPARTMENTS_DELETE: "DEPARTMENTS.DELETE",

  REPORTS_READ: "REPORTS.READ",
  REPORTS_CREATE: "REPORTS.CREATE",
  REPORTS_UPDATE: "REPORTS.UPDATE",
  REPORTS_DELETE: "REPORTS.DELETE",

  SETTINGS_READ: "SETTINGS.READ",
  SETTINGS_CREATE: "SETTINGS.CREATE",
  SETTINGS_UPDATE: "SETTINGS.UPDATE",
  SETTINGS_DELETE: "SETTINGS.DELETE",

  MEETINGS_READ: "MEETINGS.READ",
  MEETINGS_CREATE: "MEETINGS.CREATE",
  MEETINGS_UPDATE: "MEETINGS.UPDATE",
  MEETINGS_DELETE: "MEETINGS.DELETE",
} as const;

export type PermissionKey = (typeof P)[keyof typeof P];

/** Keys the product allows assigning to roles (no privilege escalation beyond this set). */
export const KNOWN_PERMISSION_KEYS: ReadonlySet<string> = new Set(
  Object.values(P),
);

/** Modules shown in tenant role matrix UI (plan + extensions for this product). */
export const PERMISSION_MATRIX_MODULES = [
  "TASKS",
  "USERS",
  "ROLES",
  "DEPARTMENTS",
  "REPORTS",
  "SETTINGS",
  "MEETINGS",
] as const;

export const PERMISSION_MATRIX_ACTIONS = [
  "READ",
  "CREATE",
  "UPDATE",
  "DELETE",
] as const;

/**
 * Expands coarse matrix cells into concrete permission keys for storage.
 * (Legacy routes still check granular keys such as TASKS.ASSIGN.)
 */
export function matrixSelectionsToKeys(
  rows: { module: string; action: string }[],
): string[] {
  const keys = new Set<string>();
  for (const { module, action } of rows) {
    const m = module.trim().toUpperCase();
    const a = action.trim().toUpperCase();
    if (!PERMISSION_MATRIX_MODULES.includes(m as any)) continue;
    if (!PERMISSION_MATRIX_ACTIONS.includes(a as any)) continue;
    keys.add(permissionKey(m, a));
  }
  return [...keys];
}

/** Lossless matrix cells for editing a role in the UI. */
export function keysToMatrixSelections(
  keys: Iterable<string>,
): { module: string; action: string }[] {
  const out: { module: string; action: string }[] = [];
  for (const k of keys) {
    if (!KNOWN_PERMISSION_KEYS.has(k)) continue;
    const { module, action } = parsePermissionKey(k);
    if (!PERMISSION_MATRIX_MODULES.includes(module as any)) continue;
    if (!PERMISSION_MATRIX_ACTIONS.includes(action as any)) continue;
    out.push({ module, action });
  }
  return dedupeMatrixRows(out);
}

function dedupeMatrixRows(
  rows: { module: string; action: string }[],
): { module: string; action: string }[] {
  const seen = new Set<string>();
  const res: { module: string; action: string }[] = [];
  for (const r of rows) {
    const k = `${r.module}:${r.action}`;
    if (seen.has(k)) continue;
    seen.add(k);
    res.push(r);
  }
  return res;
}

export function keysToRolePermissionRows(
  keys: string[],
): { module: string; action: string }[] {
  const uniq = [...new Set(keys)];
  return uniq.map((k) => parsePermissionKey(k));
}
