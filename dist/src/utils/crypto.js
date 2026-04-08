import { createHash, randomBytes } from "crypto";
export function randomToken(bytes = 32) {
    return randomBytes(bytes).toString("hex");
}
export function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}
//# sourceMappingURL=crypto.js.map