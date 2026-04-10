import type { RequestHandler } from "express";
import { randomToken } from "../utils/crypto.js";
import { buildAuthCookieOptions } from "../services/auth.service.js";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

/** Sets CSRF cookie + returns token in JSON for clients that need it */
export const csrfBootstrap: RequestHandler = (req, res) => {
  const token = randomToken(24);
  res.cookie(CSRF_COOKIE, token, {
    ...buildAuthCookieOptions(),
    httpOnly: false,
  });
  res.json({ csrfToken: token });
};

export const csrfProtect: RequestHandler = (req, res, next) => {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    next();
    return;
  }
  const url = req.originalUrl || req.url;
  if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
    next();
    return;
  }
  const header = req.get(CSRF_HEADER);
  const cookie = req.cookies?.[CSRF_COOKIE];
  if (!header || !cookie || header !== cookie) {
    res.status(403).json({ error: "CSRF validation failed" });
    return;
  }
  next();
};
