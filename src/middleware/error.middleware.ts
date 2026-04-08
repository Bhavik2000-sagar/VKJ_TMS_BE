import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

type ApiErrorBody = {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiErrorBody = { error: { message: "Not found", code: "NOT_FOUND" } };
  res.status(404).json(body);
};

export const apiErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
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
    const body: ApiErrorBody = {
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
    const status =
      typeof (err as Error & { status?: unknown }).status === "number"
        ? ((err as Error & { status: number }).status as number)
        : 500;
    const body: ApiErrorBody = {
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

