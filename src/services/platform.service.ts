import { prisma } from "../lib/prisma.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import { bootstrapTenantDefaults } from "./tenantBootstrap.service.js";
import { sendTenantInvitationEmail } from "./email.service.js";
import { env } from "../config/env.js";

export async function listTenants() {
  const result = await listTenantsPaginated({
    page: 1,
    pageSize: 50,
    sortBy: "createdAt",
    sortDir: "desc",
  });
  return result.tenants;
}

export async function listTenantsPaginated(input: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy: "createdAt" | "name" | "users";
  sortDir: "asc" | "desc";
}) {
  const skip = (input.page - 1) * input.pageSize;
  const q = input.search?.trim();
  const where = q
    ? {
        OR: [{ name: { contains: q } }],
      }
    : {};

  const orderBy =
    input.sortBy === "users"
      ? [{ users: { _count: input.sortDir } }]
      : [{ [input.sortBy]: input.sortDir }];

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      orderBy: orderBy as any,
      skip,
      take: input.pageSize,
      include: { _count: { select: { users: true } } },
    }),
    prisma.tenant.count({ where }),
  ]);

  return { tenants, total, page: input.page, pageSize: input.pageSize };
}

export async function createTenantWithInvitation(input: {
  name: string;
  slug: string;
  adminEmail: string;
}) {
  const email = input.adminEmail.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Admin email already exists");
  }

  const existingPendingInvite = await prisma.tenantInvitation.findFirst({
    where: {
      email,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingPendingInvite) {
    throw new Error("Admin email already has a pending invitation");
  }

  const slug = await ensureUniqueTenantSlug(input.slug);
  const tenant = await prisma.tenant.create({
    data: { name: input.name, slug, status: "INVITED" },
  });
  await bootstrapTenantDefaults(tenant.id);

  const inviteLink = await createAndSendTenantInvitation({
    tenantId: tenant.id,
    tenantName: tenant.name,
    email,
  });

  return { tenant, inviteLink };
}

async function ensureUniqueTenantSlug(baseSlug: string) {
  const trimmed = String(baseSlug || "").trim();
  const base = trimmed || "tenant";

  const first = await prisma.tenant.findUnique({ where: { slug: base } });
  if (!first) return base;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${base}-${i}`;
    const exists = await prisma.tenant.findUnique({
      where: { slug: candidate },
    });
    if (!exists) return candidate;
  }

  // Worst case: add random suffix (still url-safe)
  const suffix = randomToken(3)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `${base}-${suffix || "x"}`;
}

async function createAndSendTenantInvitation(input: {
  tenantId: string;
  tenantName: string;
  email: string;
  isReinvite?: boolean;
}) {
  const email = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Email already exists");
  }

  const raw = randomToken(32);
  const tokenHash = hashToken(raw);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.tenantInvitation.create({
    data: {
      tenantId: input.tenantId,
      email,
      tokenHash,
      expiresAt,
    },
  });

  const inviteLink = `${env.FRONTEND_URL.replace(/\/$/, "")}/accept-invite?token=${raw}`;
  try {
    await sendTenantInvitationEmail({
      to: email,
      tenantName: input.tenantName,
      inviteLink,
      isReinvite: input.isReinvite,
    });
  } catch (e) {
    // We still want tenant provisioning to succeed even if SMTP is misconfigured.
    console.warn(
      "[email] Failed to send tenant invitation email:",
      (e as Error)?.message ?? e,
    );
  }

  return inviteLink;
}

export async function acceptTenantInvitation(input: {
  token: string;
  password: string;
  name: string;
}) {
  const tokenHash = hashToken(input.token);
  const inv = await prisma.tenantInvitation.findFirst({
    where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!inv) throw new Error("Invalid or expired invitation");

  const adminRole = await prisma.role.findFirst({
    where: { tenantId: inv.tenantId, code: "ADMIN" },
  });
  if (!adminRole) throw new Error("Tenant not bootstrapped");

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

  await prisma.tenant.update({
    where: { id: inv.tenantId },
    data: { status: "ACTIVE" },
  });

  return user;
}

export async function setTenantStatus(input: {
  tenantId: string;
  status: "ACTIVE" | "INVITED" | "INACTIVE";
}) {
  return prisma.tenant.update({
    where: { id: input.tenantId },
    data: { status: input.status },
  });
}

export async function reinviteTenantAdmin(input: { tenantId: string }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
  });
  if (!tenant) throw new Error("Tenant not found");

  const last = await prisma.tenantInvitation.findFirst({
    where: { tenantId: input.tenantId },
    orderBy: { createdAt: "desc" },
  });
  if (!last) throw new Error("No invitation email found for this tenant");

  const inviteLink = await createAndSendTenantInvitation({
    tenantId: tenant.id,
    tenantName: tenant.name,
    email: last.email,
    isReinvite: true,
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { status: "INVITED" },
  });

  return { inviteLink };
}

export async function deleteTenant(input: { tenantId: string }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
  });
  if (!tenant) throw new Error("Tenant not found");

  await prisma.tenant.delete({ where: { id: tenant.id } });
  return { ok: true as const };
}
