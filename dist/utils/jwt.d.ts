export type AccessPayload = {
    sub: string;
    tid: string | null;
    typ: "access";
};
export type RefreshPayload = {
    sub: string;
    typ: "refresh";
    jti: string;
};
export declare function signAccessToken(payload: Omit<AccessPayload, "typ">): string;
export declare function signRefreshToken(payload: Omit<RefreshPayload, "typ">): string;
export declare function verifyAccessToken(token: string): AccessPayload;
export declare function verifyRefreshToken(token: string): RefreshPayload;
