import "dotenv/config";
import { z } from "zod";
const envBoolean = z.preprocess((value) => {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "on"].includes(normalized))
            return true;
        if (["false", "0", "no", "off"].includes(normalized))
            return false;
    }
    return value;
}, z.boolean());
const schema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string(),
    FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
    FRONTEND_URL: z.string().default("http://localhost:5173"),
    JWT_ACCESS_SECRET: z
        .string()
        .min(32)
        .default("development-only-access-secret-min-32-chars!"),
    JWT_REFRESH_SECRET: z
        .string()
        .min(32)
        .default("development-only-refresh-secret-min-32-chars!"),
    ACCESS_TOKEN_EXPIRES: z.string().default("24h"),
    REFRESH_TOKEN_EXPIRES: z.string().default("24h"),
    COOKIE_DOMAIN: z.string().optional(),
    // SMTP (preferred keys)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: envBoolean.optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    // Email (legacy alias keys; supported for convenience)
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.coerce.number().optional(),
    EMAIL_SECURE: envBoolean.optional(),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    EMAIL_FROM_NAME: z.string().optional(),
});
const raw = schema.parse(process.env);
export const env = {
    ...raw,
    SMTP_HOST: raw.SMTP_HOST ?? raw.EMAIL_HOST,
    SMTP_PORT: raw.SMTP_PORT ?? raw.EMAIL_PORT,
    SMTP_SECURE: raw.SMTP_SECURE ?? raw.EMAIL_SECURE,
    SMTP_USER: raw.SMTP_USER ?? raw.EMAIL_USER,
    SMTP_PASS: raw.SMTP_PASS ?? raw.EMAIL_PASS,
};
//# sourceMappingURL=env.js.map