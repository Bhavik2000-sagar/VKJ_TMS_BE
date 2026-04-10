import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { env } from "../config/env.js";

const ACCESS_COOKIE = "tms_access_token";
const REFRESH_COOKIE = "tms_refresh_token";

export function getAccessCookieName() {
  return ACCESS_COOKIE;
}
export function getRefreshCookieName() {
  return REFRESH_COOKIE;
}

export function buildAuthCookieOptions(maxAgeMs?: number) {
  return {
    httpOnly: true as const,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: { select: { code: true } }, tenant: true },
  });
  if (!user) throw new Error("Invalid credentials");
  if (user.tenant && user.tenant.status === "INACTIVE") {
    throw new Error("Tenant disabled");
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials");

  const access = signAccessToken({ sub: user.id, tid: user.tenantId });
  const rawRefresh = randomToken(48);
  const refreshHash = hashToken(rawRefresh);
  const refreshJwt = signRefreshToken({ sub: user.id, jti: refreshHash });

  const expires = new Date();
  expires.setDate(expires.getDate() + 1);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: expires,
    },
  });

  return {
    user,
    accessToken: access,
    refreshToken: refreshJwt,
    rawRefresh,
  };
}

export async function refreshSession(refreshJwt: string) {
  const payload = verifyRefreshToken(refreshJwt);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: payload.jti },
    include: {
      user: { include: { role: { select: { code: true } }, tenant: true } },
    },
  });
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error("Invalid refresh");
  }
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = stored.user;
  if (user.tenant && user.tenant.status === "INACTIVE") {
    throw new Error("Tenant disabled");
  }
  const access = signAccessToken({ sub: user.id, tid: user.tenantId });
  const rawRefresh = randomToken(48);
  const refreshHash = hashToken(rawRefresh);
  const newRefreshJwt = signRefreshToken({ sub: user.id, jti: refreshHash });
  const expires = new Date();
  expires.setDate(expires.getDate() + 1);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: expires,
    },
  });

  return { user, accessToken: access, refreshToken: newRefreshJwt };
}

export async function revokeRefreshByHash(jti: string | undefined) {
  if (!jti) return;
  await prisma.refreshToken.deleteMany({ where: { tokenHash: jti } });
}

export async function completePasswordReset(
  rawToken: string,
  newPassword: string,
) {
  const tokenHash = hashToken(rawToken);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!row || row.expiresAt < new Date()) {
    throw new Error("Invalid or expired reset link");
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.delete({ where: { id: row.id } }),
    prisma.refreshToken.deleteMany({ where: { userId: row.userId } }),
  ]);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new Error("Current password is incorrect");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
}
