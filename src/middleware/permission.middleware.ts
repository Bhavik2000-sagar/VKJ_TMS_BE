import type { RequestHandler } from "express";

export function requirePermission(action: string): RequestHandler {
  return (req, res, next) => {
    const perms = req.effectivePermissions;
    if (!perms?.has(action)) {
      res.status(403).json({ error: "Forbidden", required: action });
      return;
    }
    next();
  };
}
