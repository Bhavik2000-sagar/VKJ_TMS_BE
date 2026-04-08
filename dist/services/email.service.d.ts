export declare function sendTenantInvitationEmail(opts: {
    to: string;
    tenantName: string;
    inviteLink: string;
}): Promise<{
    skipped: true;
} | {
    skipped: false;
}>;
export declare function sendPasswordResetEmail(opts: {
    to: string;
    resetLink: string;
}): Promise<{
    skipped: true;
} | {
    skipped: false;
}>;
