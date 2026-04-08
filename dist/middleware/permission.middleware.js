export function requirePermission(action) {
    return (req, res, next) => {
        const perms = req.effectivePermissions;
        if (!perms?.has(action)) {
            res.status(403).json({ error: "Forbidden", required: action });
            return;
        }
        next();
    };
}
//# sourceMappingURL=permission.middleware.js.map