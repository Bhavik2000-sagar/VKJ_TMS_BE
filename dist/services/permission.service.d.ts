export declare function getEffectivePermissionActions(userId: string): Promise<Set<string>>;
export declare function assertPermission(userId: string, action: string): Promise<void>;
