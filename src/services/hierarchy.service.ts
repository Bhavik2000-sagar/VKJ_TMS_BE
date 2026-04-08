import { prisma } from "../lib/prisma.js";

/** All user IDs in the subtree where `rootId` is an ancestor (direct + indirect reports). */
export async function getSubordinateIds(rootId: string): Promise<string[]> {
  const result: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const children = await prisma.user.findMany({
      where: { managerId: id },
      select: { id: true },
    });
    for (const c of children) {
      result.push(c.id);
      queue.push(c.id);
    }
  }
  return result;
}
