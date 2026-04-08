import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { getEffectivePermissionActions } from "../services/permission.service.js";
import { getAccessCookieName } from "../services/auth.service.js";
export const authMiddleware = async (req, res, next) => {
    const token = req.cookies?.[getAccessCookieName()];
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const payload = verifyAccessToken(token);
        req.userId = payload.sub;
        req.tenantId = payload.tid;
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true },
        });
        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        req.user = user;
        req.effectivePermissions = await getEffectivePermissionActions(user.id);
        next();
    }
    catch {
        res.status(401).json({ error: "Unauthorized" });
    }
};
export const requireTenantUser = (req, res, next) => {
    if (req.tenantId == null || req.user?.tenantId == null) {
        res.status(403).json({ error: "Tenant context required" });
        return;
    }
    next();
};
export const requirePlatformUser = (req, res, next) => {
    if (req.tenantId != null || req.user?.tenantId != null) {
        res.status(403).json({ error: "Platform context required" });
        return;
    }
    next();
};
//# sourceMappingURL=auth.middleware.js.map