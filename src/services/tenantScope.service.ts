import { prisma } from "../lib/prisma.js";

/**
 * Department id + all descendants (via `parentId` tree) within a tenant.
 */
export async function getDepartmentSubtreeIds(
  tenantId: string,
  rootDepartmentId: string,
): Promise<string[]> {
  const rows = await prisma.department.findMany({
    where: { tenantId },
    select: { id: true, parentId: true },
  });
  const byParent = new Map<string | null, string[]>();
  for (const r of rows) {
    const p = r.parentId ?? null;
    const list = byParent.get(p) ?? [];
    list.push(r.id);
    byParent.set(p, list);
  }
  const out = new Set<string>();
  const queue = [rootDepartmentId];
  while (queue.length) {
    const id = queue.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const kids = byParent.get(id) ?? [];
    for (const k of kids) queue.push(k);
  }
  return [...out];
}

export async function resolveDepartmentScopeIds(
  tenantId: string,
  roleDepartmentId: string | null | undefined,
): Promise<string[] | null> {
  if (!roleDepartmentId) return null;
  return getDepartmentSubtreeIds(tenantId, roleDepartmentId);
}
