import { z } from "zod";

/** Normalized login id: lowercase, trimmed. Allowed: letters, digits, `.`, `_`, `-`. */
export const USERNAME_REGEX = /^[a-z0-9._-]{3,64}$/;

export const usernameSchema = z.preprocess(
  (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase(),
  z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(64)
    .regex(
      USERNAME_REGEX,
      "Use letters, numbers, dots, underscores, or hyphens only",
    ),
);

export function normalizeUsername(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}
