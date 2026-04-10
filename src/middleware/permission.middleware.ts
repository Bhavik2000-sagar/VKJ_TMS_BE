import type { RequestHandler } from "express";
import { permissionKey } from "../constants/permissions.js";

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

export function requireAnyPermission(actions: readonly string[]): RequestHandler {
  return (req, res, next) => {
    const perms = req.effectivePermissions;
    if (!perms || !actions.some((a) => perms.has(a))) {
      res.status(403).json({ error: "Forbidden", required: actions });
      return;
    }
    next();
  };
}

export function hasPermission(
  perms: Set<string> | undefined,
  module: string,
  action: string,
): boolean {
  return Boolean(perms?.has(permissionKey(module, action)));
}
