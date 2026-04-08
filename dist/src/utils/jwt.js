import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function signAccessToken(payload) {
    return jwt.sign({ ...payload, typ: "access" }, env.JWT_ACCESS_SECRET, {
        expiresIn: env.ACCESS_TOKEN_EXPIRES,
    });
}
export function signRefreshToken(payload) {
    return jwt.sign({ ...payload, typ: "refresh" }, env.JWT_REFRESH_SECRET, {
        expiresIn: env.REFRESH_TOKEN_EXPIRES,
    });
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (decoded.typ !== "access")
        throw new Error("Invalid token type");
    return decoded;
}
export function verifyRefreshToken(token) {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (decoded.typ !== "refresh")
        throw new Error("Invalid token type");
    return decoded;
}
//# sourceMappingURL=jwt.js.map