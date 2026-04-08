import { prisma } from "../lib/prisma.js";

export type CreateBranchInput = {
  tenantId: string;
  name: string;
  code?: string | null;
};

export type UpdateBranchInput = {
  tenantId: string;
  id: string;
  name?: string;
  code?: string | null;
};

export type CreateDepartmentInput = {
  tenantId: string;
  name: string;
  code?: string | null;
  branchId?: string | null;
};

export type UpdateDepartmentInput = {
  tenantId: string;
  id: string;
  name?: string;
  code?: string | null;
  branchId?: string | null;
};

export async function listBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: { tenantId },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createBranch(input: CreateBranchInput) {
  return prisma.branch.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      code: input.code ?? null,
    },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateBranch(input: UpdateBranchInput) {
  return prisma.branch.update({
    where: { id: input.id, tenantId: input.tenantId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
    },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteBranch(tenantId: string, id: string) {
  await prisma.branch.delete({ where: { id, tenantId } });
}

export async function listDepartments(tenantId: string, branchId?: string) {
  return prisma.department.findMany({
    where: { tenantId, ...(branchId ? { branchId } : {}) },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, name: true } },
    },
  });
}

export async function listDepartmentsPaginated(input: {
  tenantId: string;
  page: number;
  pageSize: number;
  search?: string;
  branchId?: string;
  sortBy: "name" | "code" | "createdAt";
  sortDir: "asc" | "desc";
}) {
  const term = input.search?.trim();
  const where = {
    tenantId: input.tenantId,
    ...(input.branchId ? { branchId: input.branchId } : {}),
    ...(term
      ? {
          OR: [{ name: { contains: term } }, { code: { contains: term } }],
        }
      : {}),
  } as const;

  const [total, items] = await Promise.all([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      orderBy: { [input.sortBy]: input.sortDir },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        name: true,
        code: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function createDepartment(input: CreateDepartmentInput) {
  return prisma.department.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      code: input.code ?? null,
      branchId: input.branchId ?? null,
    },
    select: {
      id: true,
      name: true,
      code: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, name: true } },
    },
  });
}

export async function updateDepartment(input: UpdateDepartmentInput) {
  return prisma.department.update({
    where: { id: input.id, tenantId: input.tenantId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
    },
    select: {
      id: true,
      name: true,
      code: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, name: true } },
    },
  });
}

export async function deleteDepartment(tenantId: string, id: string) {
  await prisma.department.delete({ where: { id, tenantId } });
}
