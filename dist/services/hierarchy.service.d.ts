/** All user IDs in the subtree where `rootId` is an ancestor (direct + indirect reports). */
export declare function getSubordinateIds(rootId: string): Promise<string[]>;
