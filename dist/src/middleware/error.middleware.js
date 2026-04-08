import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export const notFoundHandler = (_req, res) => {
    const body = { error: { message: "Not found", code: "NOT_FOUND" } };
    res.status(404).json(body);
};
export const apiErrorHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
        const body = {
            error: {
                message: "Validation error",
                code: "VALIDATION_ERROR",
                details: err.flatten(),
            },
        };
        res.status(400).json(body);
        return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const body = {
            error: {
                message: "Database error",
                code: err.code,
                details: { meta: err.meta },
            },
        };
        res.status(400).json(body);
        return;
    }
    if (err instanceof Error) {
        const status = typeof err.status === "number"
            ? err.status
            : 500;
        const body = {
            error: {
                message: status >= 500 ? "Internal server error" : err.message,
                code: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
            },
        };
        res.status(status).json(body);
        return;
    }
    res.status(500).json({ error: { message: "Internal server error", code: "INTERNAL_ERROR" } });
};
//# sourceMappingURL=error.middleware.js.map