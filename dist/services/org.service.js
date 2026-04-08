import { prisma } from "../lib/prisma.js";
export async function listBranches(tenantId) {
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
export async function createBranch(input) {
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
export async function updateBranch(input) {
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
export async function deleteBranch(tenantId, id) {
    await prisma.branch.delete({ where: { id, tenantId } });
}
export async function listDepartments(tenantId, branchId) {
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
export async function createDepartment(input) {
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
export async function updateDepartment(input) {
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
export async function deleteDepartment(tenantId, id) {
    await prisma.department.delete({ where: { id, tenantId } });
}
//# sourceMappingURL=org.service.js.map