import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import cookie from "cookie";
import { env } from "./config/env.js";
import { verifyAccessToken } from "./utils/jwt.js";
import { getAccessCookieName } from "./services/auth.service.js";

export function attachSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      if (!raw) {
        next(new Error("Unauthorized"));
        return;
      }
      const parsed = cookie.parse(raw);
      const token = parsed[getAccessCookieName()];
      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.data.userId as string;
    if (uid) socket.join(`user:${uid}`);
  });

  return io;
}

export type SocketIOServer = ReturnType<typeof attachSocket>;
