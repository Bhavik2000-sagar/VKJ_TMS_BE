import { prisma } from "../lib/prisma.js";
import { randomToken } from "../utils/crypto.js";
import { bootstrapTenantDefaults } from "./tenantBootstrap.service.js";
import bcrypt from "bcryptjs";

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
  status?: "INVITED" | "ACTIVE" | "INACTIVE";
  sortBy: "createdAt" | "name" | "users";
  sortDir: "asc" | "desc";
}) {
  const skip = (input.page - 1) * input.pageSize;
  const q = input.search?.trim();
  const where: any = {};
  if (q) {
    where.OR = [{ name: { contains: q } }];
  }
  if (input.status) {
    where.status = input.status;
  }

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

export async function getTenantDetails(input: { tenantId: string }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    include: { _count: { select: { users: true } } },
  });
  if (!tenant) throw new Error("Tenant not found");

  const adminUser = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      role: {
        OR: [{ code: "COMPANY_ADMIN" }, { code: "ADMIN" }],
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, name: true, createdAt: true },
  });

  return {
    tenant,
    adminUser,
  };
}

export async function updateTenant(input: { tenantId: string; name: string }) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new Error("Name is required");
  return prisma.tenant.update({
    where: { id: input.tenantId },
    data: { name },
  });
}

export async function createTenantWithAdminUser(input: {
  name: string;
  slug: string;
  adminUsername: string;
  tempPassword: string;
}) {
  const username = input.adminUsername.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    throw new Error("Admin username already exists");
  }

  const slug = await ensureUniqueTenantSlug(input.slug);
  const tenant = await prisma.tenant.create({
    data: { name: input.name, slug, status: "ACTIVE" },
  });
  await bootstrapTenantDefaults(tenant.id);

  const adminRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, code: "COMPANY_ADMIN" },
  });
  if (!adminRole) throw new Error("Tenant not bootstrapped");

  const passwordHash = await bcrypt.hash(input.tempPassword, 12);
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username,
      passwordHash,
      name: "Company admin",
      roleId: adminRole.id,
    },
    select: { id: true, username: true, name: true, createdAt: true },
  });

  return { tenant, adminUser };
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

export async function setTenantStatus(input: {
  tenantId: string;
  status: "ACTIVE" | "INVITED" | "INACTIVE";
}) {
  return prisma.tenant.update({
    where: { id: input.tenantId },
    data: { status: input.status },
  });
}

export async function deleteTenant(input: { tenantId: string }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
  });
  if (!tenant) throw new Error("Tenant not found");

  await prisma.$transaction(async (tx) => {
    const userIds = (
      await tx.user.findMany({
        where: { tenantId: tenant.id },
        select: { id: true },
      })
    ).map((u) => u.id);

    const roleIds = (
      await tx.role.findMany({
        where: { tenantId: tenant.id },
        select: { id: true },
      })
    ).map((r) => r.id);

    const meetingIds = (
      await tx.meeting.findMany({
        where: { tenantId: tenant.id },
        select: { id: true },
      })
    ).map((m) => m.id);

    // User-scoped records (must go before users).
    if (userIds.length) {
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordResetToken.deleteMany({
        where: { userId: { in: userIds } },
      });
    }

    // Meetings (outcomes/attendees depend on meetingId).
    if (meetingIds.length) {
      await tx.meetingAttendee.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });
      await tx.meetingOutcome.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });
    }

    // Tasks and their dependents.
    await tx.attachment.deleteMany({
      where: { task: { tenantId: tenant.id } },
    });
    await tx.taskChecklistItem.deleteMany({
      where: { task: { tenantId: tenant.id } },
    });
    await tx.taskActivity.deleteMany({
      where: { task: { tenantId: tenant.id } },
    });
    await tx.task.deleteMany({ where: { tenantId: tenant.id } });

    // Now meetings can be deleted safely.
    await tx.meeting.deleteMany({ where: { tenantId: tenant.id } });

    // Tenant-level config tables.
    await tx.slaRule.deleteMany({ where: { tenantId: tenant.id } });
    await tx.taskStatus.deleteMany({ where: { tenantId: tenant.id } });
    await tx.department.deleteMany({ where: { tenantId: tenant.id } });
    await tx.branch.deleteMany({ where: { tenantId: tenant.id } });
    await tx.template.deleteMany({ where: { tenantId: tenant.id } });

    // Roles/users (roleId FK requires users first).
    await tx.user.deleteMany({ where: { tenantId: tenant.id } });
    if (roleIds.length) {
      // Extra safety: remove role-permission join rows explicitly (also cascades).
      await tx.rolePermission.deleteMany({
        where: { roleId: { in: roleIds } },
      });
    }
    await tx.role.deleteMany({ where: { tenantId: tenant.id } });

    // Finally delete tenant.
    await tx.tenant.delete({ where: { id: tenant.id } });
  });
  return { ok: true as const };
}
