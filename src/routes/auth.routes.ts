import { Router } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { verifyRefreshToken } from "../utils/jwt.js";
import { revokeRefreshByHash } from "../services/auth.service.js";
import * as platformService from "../services/platform.service.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const MS_ACCESS = 24 * 60 * 60 * 1000;
const MS_REFRESH = 24 * 60 * 60 * 1000;

router.post("/login", async (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .parse(req.body);
  try {
    const { user, accessToken, refreshToken } = await authService.loginUser(
      body.email,
      body.password,
    );
    const opts = authService.buildAuthCookieOptions();
    res.cookie(authService.getAccessCookieName(), accessToken, {
      ...opts,
      maxAge: MS_ACCESS,
    });
    res.cookie(authService.getRefreshCookieName(), refreshToken, {
      ...opts,
      maxAge: MS_REFRESH,
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roleCode: user.role?.code,
      },
    });
  } catch {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

router.post("/refresh", async (req, res) => {
  const refresh = req.cookies?.[authService.getRefreshCookieName()];
  if (!refresh) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  try {
    const { user, accessToken, refreshToken } =
      await authService.refreshSession(refresh);
    const opts = authService.buildAuthCookieOptions();
    res.cookie(authService.getAccessCookieName(), accessToken, {
      ...opts,
      maxAge: MS_ACCESS,
    });
    res.cookie(authService.getRefreshCookieName(), refreshToken, {
      ...opts,
      maxAge: MS_REFRESH,
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
      },
    });
  } catch {
    res.status(401).json({ error: "Invalid refresh" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const body = z.object({ email: z.string().email() }).parse(req.body);
  try {
    await authService.requestPasswordReset(body.email);
    res.json({ ok: true });
  } catch (e) {
    const err = e as Error & { status?: number };
    res.status(err.status ?? 400).json({ error: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const body = z
    .object({
      token: z.string().min(10),
      password: z.string().min(8),
    })
    .parse(req.body);
  try {
    await authService.completePasswordReset(body.token, body.password);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/logout", async (req, res) => {
  const refresh = req.cookies?.[authService.getRefreshCookieName()];
  try {
    if (refresh) {
      const p = verifyRefreshToken(refresh);
      await revokeRefreshByHash(p.jti);
    }
  } catch {
    /* ignore */
  }
  const opts = authService.buildAuthCookieOptions();
  res.clearCookie(authService.getAccessCookieName(), opts);
  res.clearCookie(authService.getRefreshCookieName(), opts);
  res.json({ ok: true });
});

router.get("/me", authMiddleware, async (req, res) => {
  const perms = req.effectivePermissions ? [...req.effectivePermissions] : [];
  res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      phone: req.user!.phone,
      birthDate: req.user!.birthDate,
      notificationEnabled: req.user!.notificationEnabled,
      themePreference: req.user!.themePreference,
      tenantId: req.user!.tenantId,
      roleCode: req.user!.role?.code,
    },
    permissions: perms,
  });
});

router.patch("/me", authMiddleware, async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      phone: z.string().trim().min(1).max(40).optional().nullable(),
      birthDate: z.coerce.date().optional().nullable(),
      notificationEnabled: z.coerce.boolean().optional(),
      themePreference: z.enum(["light", "dark"]).optional(),
    })
    .parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.birthDate !== undefined ? { birthDate: body.birthDate } : {}),
      ...(body.notificationEnabled !== undefined
        ? { notificationEnabled: body.notificationEnabled }
        : {}),
      ...(body.themePreference !== undefined
        ? { themePreference: body.themePreference }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      birthDate: true,
      notificationEnabled: true,
      themePreference: true,
      tenantId: true,
      role: { select: { code: true } },
    },
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      birthDate: user.birthDate,
      notificationEnabled: user.notificationEnabled,
      themePreference: user.themePreference,
      tenantId: user.tenantId,
      roleCode: user.role?.code,
    },
  });
});

router.post("/change-password", authMiddleware, async (req, res) => {
  const body = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(200),
    })
    .parse(req.body);
  try {
    await authService.changePassword(
      req.user!.id,
      body.currentPassword,
      body.newPassword,
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post("/accept-invite", async (req, res) => {
  const body = z
    .object({
      token: z.string().min(10),
      password: z.string().min(8),
      name: z.string().min(1),
    })
    .parse(req.body);
  try {
    const user = await platformService.acceptTenantInvitation(body);
    const session = await authService.loginUser(user.email, body.password);
    const opts = authService.buildAuthCookieOptions();
    res.cookie(authService.getAccessCookieName(), session.accessToken, {
      ...opts,
      maxAge: MS_ACCESS,
    });
    res.cookie(authService.getRefreshCookieName(), session.refreshToken, {
      ...opts,
      maxAge: MS_REFRESH,
    });
    res.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        tenantId: session.user.tenantId,
        roleCode: session.user.role?.code,
      },
    });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;
