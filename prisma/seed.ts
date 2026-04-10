import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { keysToRolePermissionRows, P } from "../src/constants/permissions.js";

const prisma = new PrismaClient();

const PLATFORM_KEYS = [
  P.PLATFORM_CREATE,
  P.PLATFORM_READ,
  P.PLATFORM_UPDATE,
] as const;

async function main() {
  let platformRole = await prisma.role.findFirst({
    where: { tenantId: null, code: "SUPER_ADMIN" },
  });
  if (!platformRole) {
    platformRole = await prisma.role.create({
      data: {
        tenantId: null,
        code: "SUPER_ADMIN",
        name: "Super Admin",
        isSystem: true,
      },
    });
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId: platformRole.id },
  });
  const rows = keysToRolePermissionRows([...PLATFORM_KEYS]);
  if (rows.length) {
    await prisma.rolePermission.createMany({
      data: rows.map((r) => ({
        roleId: platformRole.id,
        module: r.module,
        action: r.action,
      })),
    });
  }

  const superUsername =
    process.env.SEED_SUPER_ADMIN_USERNAME?.trim().toLowerCase() ?? "superadmin";
  const superPass = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!";
  const superHash = await bcrypt.hash(superPass, 12);
  await prisma.user.upsert({
    where: { username: superUsername },
    create: {
      username: superUsername,
      passwordHash: superHash,
      name: "Platform Super Admin",
      tenantId: null,
      roleId: platformRole.id,
    },
    update: { passwordHash: superHash, roleId: platformRole.id },
  });

  console.log("Seed: platform super admin");
  console.log("  username:", superUsername);
  console.log("  password:", superPass);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
