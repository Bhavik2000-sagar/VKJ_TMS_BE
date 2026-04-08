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
export declare function listBranches(tenantId: string): Promise<{
    code: string | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
}[]>;
export declare function createBranch(input: CreateBranchInput): Promise<{
    code: string | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function updateBranch(input: UpdateBranchInput): Promise<{
    code: string | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function deleteBranch(tenantId: string, id: string): Promise<void>;
export declare function listDepartments(tenantId: string, branchId?: string): Promise<{
    code: string | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    branchId: string | null;
    branch: {
        name: string;
        id: string;
    } | null;
}[]>;
export declare function listDepartmentsPaginated(input: {
    tenantId: string;
    page: number;
    pageSize: number;
    search?: string;
    branchId?: string;
    sortBy: "name" | "code" | "createdAt";
    sortDir: "asc" | "desc";
}): Promise<{
    items: {
        code: string | null;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        branchId: string | null;
        branch: {
            name: string;
            id: string;
        } | null;
    }[];
    total: number;
}>;
export declare function createDepartment(input: CreateDepartmentInput): Promise<{
    code: string | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    branchId: string | null;
    branch: {
        name: string;
        id: string;
    } | null;
}>;
export declare function updateDepartment(input: UpdateDepartmentInput): Promise<{
    code: string | null;
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    branchId: string | null;
    branch: {
        name: string;
        id: string;
    } | null;
}>;
export declare function deleteDepartment(tenantId: string, id: string): Promise<void>;
