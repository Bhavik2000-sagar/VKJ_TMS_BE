import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AccessPayload = {
  sub: string;
  tid: string | null;
  typ: "access";
};

export type RefreshPayload = {
  sub: string;
  typ: "refresh";
  jti: string;
};

export function signAccessToken(payload: Omit<AccessPayload, "typ">): string {
  return jwt.sign({ ...payload, typ: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<RefreshPayload, "typ">): string {
  return jwt.sign({ ...payload, typ: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (decoded.typ !== "access") throw new Error("Invalid token type");
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  if (decoded.typ !== "refresh") throw new Error("Invalid token type");
  return decoded;
}
