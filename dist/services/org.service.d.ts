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
    branchId: string | null;
    createdAt: Date;
    updatedAt: Date;
    branch: {
        name: string;
        id: string;
    } | null;
}[]>;
export declare function createDepartment(input: CreateDepartmentInput): Promise<{
    code: string | null;
    name: string;
    id: string;
    branchId: string | null;
    createdAt: Date;
    updatedAt: Date;
    branch: {
        name: string;
        id: string;
    } | null;
}>;
export declare function updateDepartment(input: UpdateDepartmentInput): Promise<{
    code: string | null;
    name: string;
    id: string;
    branchId: string | null;
    createdAt: Date;
    updatedAt: Date;
    branch: {
        name: string;
        id: string;
    } | null;
}>;
export declare function deleteDepartment(tenantId: string, id: string): Promise<void>;
