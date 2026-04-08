import { prisma } from "../lib/prisma.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import { bootstrapTenantDefaults } from "./tenantBootstrap.service.js";
import { sendTenantInvitationEmail } from "./email.service.js";
import { env } from "../config/env.js";
export async function listTenants() {
    return prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { users: true } } },
    });
}
export async function createTenantWithInvitation(input) {
    const tenant = await prisma.tenant.create({
        data: { name: input.name, slug: input.slug },
    });
    await bootstrapTenantDefaults(tenant.id);
    const raw = randomToken(32);
    const tokenHash = hashToken(raw);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.tenantInvitation.create({
        data: {
            tenantId: tenant.id,
            email: input.adminEmail,
            tokenHash,
            expiresAt,
        },
    });
    const inviteLink = `${env.FRONTEND_URL.replace(/\/$/, "")}/accept-invite?token=${raw}`;
    await sendTenantInvitationEmail({
        to: input.adminEmail,
        tenantName: tenant.name,
        inviteLink,
    });
    return { tenant };
}
export async function acceptTenantInvitation(input) {
    const tokenHash = hashToken(input.token);
    const inv = await prisma.tenantInvitation.findFirst({
        where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!inv)
        throw new Error("Invalid or expired invitation");
    const adminRole = await prisma.role.findFirst({
        where: { tenantId: inv.tenantId, code: "ADMIN" },
    });
    if (!adminRole)
        throw new Error("Tenant not bootstrapped");
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(input.password, 12);
    const user = await prisma.user.create({
        data: {
            tenantId: inv.tenantId,
            email: inv.email,
            passwordHash,
            name: input.name,
            roleId: adminRole.id,
        },
        include: { role: true },
    });
    await prisma.tenantInvitation.update({
        where: { id: inv.id },
        data: { consumedAt: new Date() },
    });
    return user;
}
//# sourceMappingURL=platform.service.js.map